# GitHub Blocks Template

> 📣 Use this repository as a starter template if you're a GitHub user interested in building your own custom Blocks!

This project contains [React](https://reactjs.org/) components written in
[Typescript](https://www.typescriptlang.org/) and bundled with
[Vite](https://vitejs.dev/). Read on to learn how to build Blocks with it!

#### GitHub Blocks API

A Block is a React component; it receives props and returns JSX. The Blocks application provides props describing the content to render, and also callback props that Blocks can use to update content or metadata, or call the GitHub API.

There are two kinds of of Blocks: File Blocks and Folder Blocks. Their API is mostly the same, except that File Blocks receive file content and Folder Blocks receive folder content.

All blocks receive the following props:

```ts
interface CommonBlockProps {
  // metadata from `blocks.config.json`
  block: {
    id: string;
    type: string;
    title: string;
    description: string;
    entry: string;
    matches?: string[];
  };

  // context about the repo, file / folder, and version
  context: {
    path: string;
    file: string; // for File Blocks
    folder: string; // for Folder Blocks
    repo: string;
    owner: string;
    sha: string;
  };

  // arbitrary metadata for Blocks to store configuration etc.
  metadata: any;
  onUpdateMetadata: (newMetadata: any) => void;

  // callback to call any GET endpoint in the GitHub API:
  // https://docs.github.com/en/rest/overview/endpoints-available-for-github-apps
  // e.g. `/repos/{owner}/{repo}/contributors`
  onRequestGitHubData: (
    path: string,
    params: Record<string, any>
  ) => Promise<any>;

  onNavigateToPath: (path: string) => void;

  // returns a list of repos containing blocks
  onRequestBlocksRepos: (params?: {
    path?: string; // restrict to blocks that match the path (see `matches` in `blocks.config.json`)
    searchTerm?: string; // restrict to blocks matching the search term
    repoUrl?: string; // restrict to blocks in the repo
    type?: "file" | "folder"; // restrict to blocks of this type
  }) => Promise<BlocksRepo[]>;

  // a React component that renders a block viewing a file or folder
  BlockComponent: ({
    block,
    context,
  }: {
    // owner, repo, and id identifying the block
    block: { owner: string; repo: string; id: string };

    // optional context specifying the file or folder to view;
    // omitted context or omitted fields default to the current file or folder
    context?:
      owner?: string;
      repo?: string;
      path?: string;
      sha?: string;
    };
  }) => JSX.Element;
}
```

File Blocks additionally receive

```ts
interface FileBlockProps {
  // the file content
  content: string;
  // callback to update the file content
  onUpdateContent: (newContent: string) => void;

  // the original file content
  originalContent: string;

  // whether or not the user can edit the content
  isEditable: boolean;
}
```

Folder Blocks additionally receive

```ts
interface FolderBlockProps {
  // flat list of files and folders in the tree
  tree: {
    path?: string;
    mode?: string;
    type?: string;
    sha?: string;
    size?: number;
    url?: string;
  }[];
}
```

`metadata` is a free-form prop that can be used to store arbitrary data about the file. It's up to you to decide what you want to store in this object: anywhere from definitions of data visualizations in a charts Block to annotations for a code Block. This is unique per file/folder per Block and stored within a [`.github/blocks/file/`](https://github.com/githubnext/blocks-tutorial/tree/main/.github/blocks) folder within the viewed repo. To update the metadata, you can call the `onUpdateMetadata` prop with the updated data; the user will be prompted to accept the change and create a new commit in the repo.

File Blocks can implement editable content by calling `onUpdateContent` to update the current content. The Blocks application has a Save button which prompts the user to accept the change and create a new commit (or branch) in the repo. When content has been updated but not yet committed, the `originalContent` prop contains the original file content, so the block can show a diff. When the `isEditable` flag is false, the user does not have permission to edit the file, so the block should disable editing.

Blocks can be nested inside other blocks using `BlockComponent`; you can
retrieve a list of available blocks using `onRequestBlocksRepos`. See the
[edit-and-preview](https://github.com/githubnext/blocks-examples/blob/main/blocks/file-blocks/edit-and-preview/index.tsx)
block for an example of their use.

A few caveats and callouts:

- You can import CSS files or split your block into multiple TypeScript files, and everything will be bundled with your block.
- You can use any third-party dependencies from NPM; just add them with `yarn add` and import them as usual, and they'll be bundled with your block.
- The [GitHub Primer React components](https://primer.style/react/) are already included as a dependency
- Your Block entry file **must have the Block component as its default export** so the GitHub Blocks application can find it.

##### Relevant repos

[Blocks examples](https://github.com/githubnext/blocks-examples)

Example blocks that we've built to showcase the API.

[Blocks utility library](https://github.com/githubnext/blocks-dev)

This template project includes a dependency on the GitHub Blocks utility library, which contains types and functions to make it easier to build Blocks. You can import them from `@githubnext/blocks`; see [the repository page](https://github.com/githubnext/blocks-dev) for more detail.

## Setup

This repo is a template! To use it just click on the "Use this template" button on the top right to set it up for your use.

<img width="495" alt="&quot;Use this template&quot; button" src="https://user-images.githubusercontent.com/8978670/144893319-5d45ab5c-12c0-42b4-99f8-97f658deb03b.png" />

The button will take you to a screen to specify what you want to name your own repo.

<img width="801" alt="&quot;Create a new repository from blocks-template&quot; screen" src="https://user-images.githubusercontent.com/8978670/144893351-25b24bfa-3400-4e92-9a2a-618b3ac06a5e.png" />

## Step 1. Develop locally

```bash
git clone <repo URL>
yarn # install dependencies
yarn start # start the dev server
```

A development server should now be running on [localhost:4000](localhost:4000).

## Step 2. View your development server within the Blocks app

When you visit [localhost:4000](localhost:4000) in your browser, you'll be
redirected to the Blocks app with your locally-developed blocks embedded in it.
You can see your blocks by clicking on the block picker toward the top of the
page (they're shown at the top in blue with a plug icon):

<img alt="Block picker" src="https://user-images.githubusercontent.com/56439/181648955-101b6567-3f9b-44b3-af99-7ef3ca6161b9.png" width="418" />

This starter project has one example folder block and one example file block.
Try choosing one of the example blocks in the block picker to see it in action.
When you make changes to the block code it will be hot-reloaded in the app.

If you don't see your blocks, make sure that:

- your development server is running
- there's a `devServer` query parameter in the URL pointing to your development server [like this](https://blocks.githubnext.com/githubnext/blocks-tutorial?devServer=http://localhost:4000)

## Step 3. Build your custom Blocks with the GitHub Blocks API

To create your own custom blocks you need to do two things:

### Step 3.1: Define your custom block

If you open up `/blocks.config.json`, you'll notice an array of block objects
with the definitions for each custom block. Block objects follow this interface:

```ts
interface BlockDefinition {
  type: "file" | "folder";
  id: string;
  title: string;
  description: string;
  entry: string;
  matches?: string[];
}
```

You have to define these properties for your own custom Block.

From top to bottom:

- `type` determines whether this block applies to files or folders.
- `id` is an identifier string for this block, like `"code-block"`. GitHub Blocks uses this to determine which block to render; it needs to be unique within your project.
- `title` and `description` control how your block appears within the GitHub Blocks application.
- `entry` is the path (relative to the project root) to the block's entry point, like `"blocks/example-file-block/index.tsx"`.
- `matches` is an array of globs describing filenames for which GitHub Blocks should show this block as an option, like `["*.json"]` for a block that handles JSON files, or `["*"]` for one that handles any file. (The glob syntax follows https://github.com/micromatch/picomatch)

Note that the `/blocks.config.json` file is not hot-reloaded, so you'll need to
refresh the app to pick up changes.

### Step 3.2: Code your Block

Your code goes in the `blocks/` directory. Here you'll find the two example
blocks as a starting point. You can modify them, rename them (don't forget to
update `blocks.config.json` if you change the path or file names), or just
delete them.

## Step 4. Deploy your Blocks to production

To make your custom block accessible to the Blocks app without your development
server running, there are a few steps you need to take:

### Step 4.1: Commit your code and push a new tag

This template includes a GitHub Action to build a production version of your
block. All you need to do to kick off the build process is commit and push your
code changes, then create a new tag:

```bash
git commit -m'made an awesome block'
git push
git tag 0.9.0 # Create a new tag with your own version number
git push --tags # Push the tag to GitHub
```

The action runs `yarn build`, which can be more picky than the development
server. You might want to run `yarn build` manually to ensure the action will
succeed, or to debug an issue if the action fails.

### Step 4.2: Wait for the build process to finish

Look under Actions for your repo to see that your build has finished. The latest successful build should now be accessible in the GitHub Blocks application.

From the repository settings page, make sure that your workflow has **Read and write** permissions or the action will fail with a 403 error.

<img width="805" alt="&quot;Workflow permissions&quot; setting" src="https://user-images.githubusercontent.com/5148596/167847856-22ad190a-d73c-4b97-a0e2-c3c854db0d4f.png" />

<img width="1097" alt="Successful build action screen" src="https://user-images.githubusercontent.com/8978670/144665796-cb1ff450-c872-47c5-90b3-f74aea10286b.png" />

<img width="152" alt="Tagged release" src="https://user-images.githubusercontent.com/8978670/144665673-431e28f9-9e9d-43b3-87f8-1e5d98bed92c.png" />

### Step 4.3: Test your production block in the Blocks app

Once the action has completed, visit [https://blocks.githubnext.com/] (with no
`devServer` parameter in the URL), then paste your repo URL
(`https://github.com/{owner}/{repo}`) into the block picker search bar. This
will load the production version of your block, without using your development
server.

Everything should work the same as before!

### Step 4.4: Add the topic `github-blocks` to your repo (optional)

If you want your blocks to show up in the block picker in GitHub Blocks, you need to tag this repository with the topic `github-blocks` so the application can find it.

<img width="323" alt="Repository tagged with &quot;github-blocks&quot;" src="https://user-images.githubusercontent.com/8978670/144665902-63543c98-2486-4e13-9c54-f1d4bc6544a4.png" />

**This step is optional!** If you aren't ready to share your block with others,
don't tag the repo. Your blocks won't show up in the block picker by default,
but you can still paste the repo URL (`https://github.com/{owner}/{repo}`) into
the search box at the top of the block picker to search blocks in the repo. If
your repo is private, only people with access to the repo can see and use your
blocks.
