import { FolderBlockProps, getLanguageFromFilename } from "@githubnext/blocks";
import { Box, FormControl, Select } from "@primer/react";
import { tw } from "twind";
import { useEffect, useState } from "react";
import { Endpoints } from "@octokit/types";
import { Timeline } from "./Timeline";
import { AnimatePresence, motion } from "framer-motion";
import SyntaxHighlighter from "react-syntax-highlighter";
import style from "react-syntax-highlighter/dist/esm/styles/hljs/github-gist";
import unidiff from "unidiff"
import diffLineToWord from "diff-linetoword"
import { useDebouncedCallback } from 'use-debounce';
import "./index.css"

type Diff = any
export type RawTree =
  Endpoints["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"]["response"]["data"];
export type Tree = RawTree["tree"];
export type File = RawTree["tree"][0] & {
  content: string,
  diff: Diff,
}
const ignoredExtensions = ["png", "jpg", "jpeg", "gif", "pdf"];
export default ({ tree, context, onRequestGitHubData }: FolderBlockProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  const [didActiveFileIndexJustChange, setDidActiveFileIndexJustChange] = useState(false)
  const onActiveFileIndexChange = useDebouncedCallback(() => {
    setDidActiveFileIndexJustChange(false)
  }, 3100)
  useEffect(() => {
    if (isLoading) return
    setDidActiveFileIndexJustChange(true)
    onActiveFileIndexChange()
  }, [activeFileIndex])

  const activeFile = files[activeFileIndex];
  const lines = activeFile?.diff
  const language = activeFile?.path ? getLanguageFromFilename(activeFile?.path.split("/").pop() || "") : ""
  const languageCommentMarker = languageCommentMarkersMap[language] || "#"
  const numberOfCommentLines = lines?.findIndex(line => !line.value?.startsWith(languageCommentMarker)) || 0

  const onFetchFileContents = async (path) => {
    const url = `/repos/${context.owner}/${context.repo}/contents/${path}`
    const data = await onRequestGitHubData(url, {
      ref: context.sha,
    });
    const decodedData = atob(data.content);
    return decodedData;
  }
  const onUpdateFiles = async () => {
    const immediateFiles = tree.filter(item => (
      item.type === "blob"
      && item.path?.startsWith(`${context.path}/`)
      && item.path?.slice(context.path.length + 1).split("/").length === 1
    ))
    const files = await Promise.all(immediateFiles.map(async item => {
      const extension = item.path?.split("/").pop()?.split(".").pop() || "";
      if (ignoredExtensions.includes(extension)) return;
      const data = await onFetchFileContents(item.path);
      return { ...item, content: data }
    }))
    const sortedFiles = files.filter(Boolean).sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path > b.path) return 1;
      return 0;
    })
    const filesWithDiffs = sortedFiles.map((file, index) => {
      const diff = getDiff(sortedFiles[index - 1]?.content || "", file.content)
      return { ...file, diff }
    })
    setFiles(filesWithDiffs)
    setIsLoading(false);
  }
  useEffect(() => { onUpdateFiles() }, [context.path, context.sha])


  if (isLoading) return (
    <Box className={tw`flex flex-col items-center justify-center w-full h-full italic`} color="fg.subtle">
      Loading...
    </Box>
  )
  if (!files.length) return (
    <Box className={tw`flex flex-col items-center justify-center w-full h-full italic`} color="fg.subtle">
      No files found
    </Box>
  )

  return (
    <Box p={4}>
      <Box
        borderColor="border.default"
        borderWidth={1}
        borderStyle="solid"
        borderRadius={6}
        overflow="hidden"
      >
        <Box
          display="flex"
          background="canvas.subtle"
          borderColor="border.default"
          borderBottomWidth={1}
          borderStyle="solid"
          p={3}
        >
          {!!activeFile && files.length > 1 && (
            <Box width="100%">
              <Timeline
                files={files}
                activeFileIndex={activeFileIndex}
                setActiveFileIndex={setActiveFileIndex}
              />
            </Box>
          )}
        </Box>

        {!!activeFile && (
          <pre className={tw`py-6 px-9 transition-all duration-300`} style={{
            height: lineHeight * (lines?.length || 0) + 80
          }}>
            <AnimatePresence>
              {lines.map((line, index) => {
                if (numberOfCommentLines > index) return (
                  <motion.div
                    key={`line-${index}`}
                    className={tw(
                      `absolute flex min-h-[1em] -mx-4 -my-2`,
                      "bg-[#ddf4ff] px-4 py-3 text-[#0550ae]"
                    )}
                    exit={{
                      x: -100, opacity: 0,
                      transition: { delay: 0 }
                    }}
                    transition={{ delay: 0, duration: 0 }}
                    style={{ transform: `translate(0, ${index * lineHeight}px)` }}
                  >
                    <Box className={tw`w-[2em] mr-1 text-[#0550ae] select-none transition-opacity`} style={{
                      opacity: didActiveFileIndexJustChange ? 0 : 1,
                      transitionDuration: didActiveFileIndexJustChange ? "0s" : "1s",
                    }}>
                      {index + 1}
                    </Box>
                    {line.value}
                  </motion.div>
                )
                const numberOfMatchingPreviousLines = lines.slice(0, index).filter(previousLine => previousLine.value === line.value).length;
                const changeIndex = lines.slice(0, index).filter(d => d.state !== "unchanged").length
                return (
                  <motion.div
                    key={`line--${line.value}--${numberOfMatchingPreviousLines}`}
                    className={tw(
                      `absolute flex min-h-[1.3em] py-[0.1em]`,
                    )}
                    initial={{
                      y: index * lineHeight + 5, x: 100, opacity: 0
                    }}
                    animate={{
                      y: index * lineHeight + 5, x: 0, opacity: 1,
                    }}
                    exit={{
                      x: -100, opacity: 0,
                      transition: { delay: 0 }
                    }}
                    transition={{
                      x: { type: "tween", delay: changeIndex * 0.05 + 0.2 },
                      opacity: { type: "tween", delay: changeIndex * 0.05 + 0.2 },
                    }}
                  >
                    {activeFileIndex > 0 && line.state === "added" && (
                      <div className={tw`absolute left-[-1.1em] top-[0.36em] bottom-0 w-[0.5em] text-[#2da44e] text-xs font-semibold`}>+</div>
                    )}
                    <Box className={tw`w-[2em] mr-1 select-none transition-opacity`} color="fg.subtle" style={{
                      opacity: didActiveFileIndexJustChange ? 0 : 0.5,
                      transitionDuration: didActiveFileIndexJustChange ? "0s" : "1s",
                    }}>
                      <span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        {index + 1}
                      </span>
                    </Box>
                    {line.modifiedCharacters?.split("").map((char, index) => char !== "0" && (
                      <div className={tw`absolute left-0 top-0 bottom-0 w-[1ch] bg-[#FDF6D9]`}
                        key={`modified-${index}`}
                        style={{
                          left: `calc(2.2em + ${index}ch`,
                        }}
                      />
                    ))}
                    <SyntaxHighlighter
                      language={syntaxHighlighterLanguageMap[language] || "javascript"}
                      lineNumberStyle={{ opacity: 0.45 }}
                      className={tw(`!p-0 !bg-transparent !z-10`)}
                      style={style}
                    >
                      {line.value}
                    </SyntaxHighlighter>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </pre>
        )}
      </Box>
    </Box >
  );
}
const lineAnimationVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
}

const syntaxHighlighterLanguageMap = {
  JavaScript: "javascript",
  TypeScript: "typescript",
} as Record<string, string>;

const languageCommentMarkersMap = {
  JavaScript: "//",
  TypeScript: "//",
  Python: "#",
  C: "//"
}
const lineHeight = 25

const getDiff = (oldContent = "", newContent = "") => {
  const diff = unidiff.diffLines(oldContent, newContent)
  let lines = []
  let runningRemovedLines = ""
  diff.forEach(part => {
    if (part.removed) {
      runningRemovedLines += part.value
    } else if (part.added) {
      const runningRemovedLinesSplit = runningRemovedLines.split("\n")
      let newLines = part.value.split("\n")
      if (newLines.slice(-1)[0] === "") newLines = newLines.slice(0, -1)
      lines = [
        ...lines,
        ...newLines.map((line, index) => {
          const oldLine = runningRemovedLinesSplit[index] || ""
          if (!oldLine) return { value: line, state: "added" }
          const diff = unidiff.diffAsText(oldLine, line)
          const patchMarker = "***!***"
          const patch = diffLineToWord(diff, {
            added: `${patchMarker}%s${patchMarker}`,
            removed: ''
          })
          const cleanedPatch = patch.split("@@").slice(2).join("@@").slice(1)
          let modifiedCharacters = ""
          cleanedPatch.split(patchMarker).forEach((text, index) => {
            text.split("").forEach(() => {
              modifiedCharacters += index % 2 ? 1 : 0
            })
          })
          // cut down on actually-replace lines that are marked as modified
          const justRealCharacters = modifiedCharacters.split("").filter((char, index) => {
            if (line[index] && line[index] === " ") return false
            return true
          }).join("")
          if (justRealCharacters.replaceAll("0", "").length > justRealCharacters.length * 0.6) {
            return {
              value: line,
              state: "added",
              removedCharacters: runningRemovedLinesSplit[index],
            }
          }

          return {
            value: line,
            state: "modified",
            removed: runningRemovedLinesSplit[index],
            patch: cleanedPatch,
            modifiedCharacters
          }
        }),
      ]
      runningRemovedLines = ""
    } else {
      const runningRemovedLinesSplit = runningRemovedLines.split("\n")
      let newLines = part.value.split("\n")
      if (newLines.slice(-1)[0] === "") newLines = newLines.slice(0, -1)
      lines = [
        ...lines,
        ...newLines.map((line, index) => ({
          value: line,
          state: "unchanged",
          removed: runningRemovedLinesSplit[index],
        })),
      ]
      runningRemovedLines = ""
    }
  })

  return lines
}