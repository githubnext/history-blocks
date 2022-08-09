import { FolderBlockProps, getLanguageFromFilename } from "@githubnext/blocks";
import { Box, FormControl, Select } from "@primer/react";
import { tw } from "twind";
import { useEffect, useState } from "react";
import { Endpoints } from "@octokit/types";
import { Timeline } from "./Timeline";
import { motion } from "framer-motion";
import SyntaxHighlighter from "react-syntax-highlighter";
import style from "react-syntax-highlighter/dist/esm/styles/hljs/github-gist";
import "./index.css"

export type RawTree =
  Endpoints["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"]["response"]["data"];
export type Tree = RawTree["tree"];
export type File = RawTree["tree"][0] & {
  content: string,
}
export default ({ tree, context, onRequestGitHubData }: FolderBlockProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const getLessonNameFromLessonPath = (lessonPath: string) => {
    const filename = lessonPath.split("/").pop()?.split(".")[0] || "";
    // remove trailing numbers
    return filename.replace(/\d+$/, "");
  }
  const allLessonNames = files.map(file => file.path
    ? getLessonNameFromLessonPath(file.path)
    : "");
  const uniqueLessonNames = [...new Set(allLessonNames)];
  const [lessonName, setLessonName] = useState<string>(uniqueLessonNames[0]);
  const filesInLesson = files.filter(file => file.path?.startsWith(`${context.path}/${lessonName}`));

  const activeFile = filesInLesson[activeFileIndex];
  const lines = activeFile?.content?.split("\n");
  const language = activeFile?.path ? getLanguageFromFilename(activeFile?.path.split("/").pop() || "") : ""
  const languageCommentMarker = languageCommentMarkersMap[language] || "#"
  const numberOfCommentLines = lines?.findIndex(line => !line.startsWith(languageCommentMarker)) || 0

  useEffect(() => {
    setActiveFileIndex(0);
  }, [lessonName]);

  useEffect(() => {
    setLessonName(uniqueLessonNames[0]);
  }, [uniqueLessonNames.join(",")]);

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
    // .slice(0, 3)
    const files = await Promise.all(immediateFiles.map(async item => {
      const data = await onFetchFileContents(item.path);
      return { ...item, content: data }
    }))
    const sortedFiles = files.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    })
    setFiles(sortedFiles)
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
          <FormControl
            sx={{ width: "20em" }}
          >
            <FormControl.Label>Lesson</FormControl.Label>
            <Select value={lessonName} onChange={e => setLessonName(e.target.value)}
            >
              {uniqueLessonNames.map(name => (
                <Select.Option key={name} value={name}> {name} </Select.Option>
              ))}
            </Select>
          </FormControl>
          {!!activeFile && filesInLesson.length > 1 && (
            <Box px={2} width="100%">
              <Timeline
                files={filesInLesson}
                activeFileIndex={activeFileIndex}
                setActiveFileIndex={setActiveFileIndex}
              />
            </Box>
          )}
        </Box>

        {!!activeFile && (
          <pre className={tw`p-6`}>
            {lines.map((line, index) => {
              if (numberOfCommentLines > index) return (
                <motion.div
                  key={line || `line-${index}`}
                  layout
                  className={tw(
                    `flex min-h-[1em] -mx-4 -my-2`,
                    "bg-[#ddf4ff] px-4 py-3 text-[#0550ae]"
                  )}
                >
                  <Box className={tw`w-[2em] mr-1 text-[#0550ae] select-none`}>
                    {index + 1}
                  </Box>
                  {line}
                </motion.div>
              )
              const numberOfMatchingPreviousLines = lines.slice(0, index).filter(previousLine => previousLine === line).length;
              return (
                <motion.div
                  key={`line--${line}--${numberOfMatchingPreviousLines}`}
                  layout
                  className={tw(
                    `flex min-h-[1.3em] py-[0.1em]`,
                  )}
                  initial={{ x: -30, opacity: 0.5 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  exit={{ x: -30, opacity: 0.5 }}
                >
                  <Box className={tw`w-[2em] mr-1 select-none`} color="fg.subtle">
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                      {index + 1}
                    </motion.span>
                  </Box>
                  <SyntaxHighlighter
                    language={syntaxHighlighterLanguageMap[language] || "javascript"}
                    lineNumberStyle={{ opacity: 0.45 }}
                    className={tw(`!p-0 !bg-transparent`)}
                    wrapLines
                    wrapLongLines
                    style={style}
                  >
                    {line || " "}
                  </SyntaxHighlighter>
                </motion.div>
              )
            })}
          </pre>
        )}
      </Box>
    </Box>
  );
}

const syntaxHighlighterLanguageMap = {
  JavaScript: "javascript",
  TypeScript: "typescript",
} as Record<string, string>;

const languageCommentMarkersMap = {
  JavaScript: "//",
  TypeScript: "//",
  Python: "#",
}