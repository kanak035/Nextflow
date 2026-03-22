# NextFlow

NextFlow is a visual AI workflow builder built with Next.js, React Flow, Clerk, Trigger.dev, Prisma, Neon, Gemini, and Transloadit.

## Local Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Neon, Clerk, Gemini, Trigger.dev, and Transloadit keys
3. Install dependencies with `npm install`
4. Start the app with `npm run dev`
5. Start the Trigger worker with `npm run trigger:dev`
6. Open `http://localhost:3000`

## Localhost Verification

### Authentication

- Sign out and visit `/`
- You should be prompted to sign in with Clerk

### Save / Load

- Change the workflow name
- Click `Save`
- Refresh the page
- The same workflow and graph should load again

### Import / Export

- Click `Export JSON`
- Click `Load Sample`
- Click `Import JSON` and select a previously exported file
- The imported workflow should render on the canvas

### Drag And Drop

- Drag a node button from the left sidebar onto the canvas
- A new node should appear where you dropped it
- Clicking a node button should still add it to the canvas

### Undo / Redo

- Add a node
- Click `Undo` or press `Cmd/Ctrl + Z`
- The node should disappear
- Click `Redo` or press `Cmd/Ctrl + Shift + Z`
- The node should come back

### Edge Removal

- Connect two nodes
- Double-click the edge
- The edge should be removed immediately

### Type-safe Connections

- Try connecting `Upload Video` to an LLM prompt input
- The connection should be rejected
- Try creating a cycle
- The connection should be rejected

### Crop Parameters From Text

- Connect a `Text Node` to `Crop Image -> x`, `y`, `width`, or `height`
- The connected field should become disabled
- Remove the edge
- The field should become editable again

### Extract Frame Timestamp

- Type `50%` into `Extract Frame`
- Run the node
- It should extract a frame near the middle of the video

### Persistent Media Outputs

- Run `Crop Image` or `Extract Frame`
- The result should load from `/generated/...`
- The result should still render after a page refresh

### Selected-node Execution

- Select one or more nodes on the canvas
- Click `Run Selected`
- A new history entry should appear with `partial` scope
- Only the selected nodes should execute

### Parallel DAG Execution

- Click `Load Sample`
- Upload an image and a video
- Run the full workflow
- The two independent branches should progress without waiting on each other unnecessarily
- The final LLM node should wait until both upstream branches are done

## Required Environment Variables

- `DATABASE_URL`
- `GOOGLE_GEMINI_API_KEY`
- `NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

## Vercel Deployment

For Vercel:

1. Import the repo into Vercel
2. Add the values from `.env.example` as project environment variables
3. Deploy

Note: generated media files currently persist locally under `public/generated`. For production, replace that with object storage such as S3, R2, or Uploadcare/Transloadit output storage.
