import { FileBlockProps } from "@githubnext/blocks";
import { Box } from "@primer/react";
import { Liquid, Template } from 'liquidjs';
import { useEffect, useRef, useState } from "react";
import { ReactLiquid } from 'react-liquid';
import showdown from "showdown";
import "./index.css";

export default ({ content, context, onRequestGitHubData }: FileBlockProps) => {
  const containerElement = useRef<HTMLDivElement>(null)

  // lets split the content into sections and handle "next"ing here
  const [activeMaxSection, setActiveMaxSection] = useState(0)
  const sections = content.split("{% next %}")

  // we need to get the name of the current branch, for static image paths
  const [branchName, setBranchName] = useState("main")
  const updateBranchName = async () => {
    const res = await onRequestGitHubData(`/repos/${context.owner}/${context.repo}/git/refs/heads/${context.sha}`)
    setBranchName(res.ref.split("/").slice(2).join("/"))
  }
  useEffect(() => { updateBranchName() }, [branchName])

  return (
    <Box px={8} pb={6} className="markdown-body" ref={containerElement}>
      {sections.map((section, index) => {
        return (
          <div
            key={index}
            id={`section-${index}`}
            className={`${index ? "py-4" : "pt-6 pb-4"} ${activeMaxSection < index ? "d-none" : ""}`} style={{ minHeight: "100vh" }}>
            <ReactLiquid
              template={parseContent(section, { ...context, branchName })}
              liquidEngine={engine}
              render={(renderedTemplate) => {
                // we want to render the content as HTML
                return <span dangerouslySetInnerHTML={renderedTemplate} />
              }}
            />
            {index < sections.length - 1 && (
              <button className="btn btn-primary"
                disabled={activeMaxSection > index}
                onClick={() => {
                  // show the next section and scroll to it
                  setActiveMaxSection(index + 1)
                  setTimeout(() => {
                    if (!containerElement.current) return
                    const newSection = containerElement.current.querySelector(`#section-${index + 1}`)
                    if (!newSection) return
                    newSection.scrollIntoView({ behavior: "smooth" })
                  })
                }}>
                Next
              </button>
            )}
          </div>
        )
      })}
    </Box>
  );
}

const converter = new showdown.Converter()
const parseContent = (content: string, context: FileBlockProps["context"] & { branchName: string }) => {
  // we need to convert markdown to HTML
  const html = converter.makeHtml(content)
  // update relative image urls
  const updatedHtml = html.replace(/<img[^>]+src="([^"]+)"/g, (match, url) => {
    const isRelative = !url.startsWith("http")
    const pathRoot = context.path.split("/").slice(0, -1).join("/")
    if (isRelative) {
      const newUrl = `https://raw.githubusercontent.com/${context.owner}/${context.repo}/${context.branchName}/${pathRoot}/${url}`
      const newStr = match.replace(url, newUrl)
      return newStr
    }
    return match
  })
  return updatedHtml
}

// let's create our Liquid engine
const engine = new Liquid({
  extname: '.liquid',
})
// let's register our custom Tag Plugins
// these are ported from https://github.com/cs50/jekyll-theme-cs50/blob/a2fc557d2457530cf7e752c52b443c7c12d5b405/lib/jekyll-theme-cs50.rb
engine.registerTag("spoiler", {
  parse: function (token, remainTokens) {
    this.name = token.args.split(':')[0].slice(1, -1) || "Spoiler"
    this.template = []

    this.liquid.parser.parseStream(remainTokens)
      .on('tag:endspoiler', function () { this.stop() })
      .on('template', (tpl: Template) => this.template.push(tpl.str))
      .on('end', () => { throw new Error(`tag ${token.getText()} not closed`) })
      .start()
  },
  render: function (tagToken, context) {
    const summary = this.name
    const html = this.template
    return `<details class="Popover position-relative my-3">
    <summary class="btn mt-3">${summary}</summary>
    <div class="Popover-message Popover-message--top-left p-4 Box box-shadow-extra-large bg-gray-light"
    style="margin: 10px; width: 36em; max-width: 100%;">
      ${html}
    </div>
  </details>`
  },
})
engine.registerTag("endspoiler", {
  parse: function (token) {
    this.text = token.input.slice(token.end).split("{% endspoiler %}")[0]
  },
  render: function (tagToken, context) { },
})
engine.registerTag("video", {
  parse: function (token) {
    this.url = token.args
  },
  render: function () {
    const matches = this.url.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)

    if (matches) {
      // Default components
      let components = {
        "modestbranding": "0",
        "rel": "0",
        "showinfo": "0"
      };

      // Supported components
      const options = ["autoplay", "controls", "end", "index", "list", "modestbranding", "mute", "playlist", "rel", "showinfo", "start", "t"]
      const url = new URL(this.url)
      const params = url.searchParams
      options.forEach(option => {
        if (params[option]) {

          // Add to components, but map t= to start=
          if (option === "t" && !params["start"]) {
            components["start"] = params["t"][0];
          } else {
            components[option] = params[option][0];
          }
        }
      })

      if (!params["list"]?.empty || !params["playlist"]?.empty) components["showinfo"] = "1"

      const videoId = matches[1]

      // Build URL
      // https://support.google.com/youtube/answer/171780?hl=en
      const query = Object.keys(components).map(key => `${key}=${components[key]}`).join("&")
      const src = `https://www.youtube.com/embed/${videoId}?${query}`;

      // Return HTML
      return `<iframe width="100%" style="aspect-ratio: 16 / 9" allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class='border' data-video src='${src}'></iframe>`
    }

    // If CS50 Video Player
    if (/^https?:\/\/video\.cs50\.io\/([^?]+)/g.test(this.url)) {
      return `<iframe allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class='border' data-video src='${this.url}'></iframe>`
    }

    // Static
    return `<div class='ratio ratio-16x9'><img alt='static' class='border' data-video src='https://i.imgur.com/xnZ5A2u.gif'></div>`
  },
})
