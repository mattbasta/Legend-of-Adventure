import settings from "./settings";

const canvases: Record<string, HTMLCanvasElement> = {};
const contexts: Record<string, CanvasRenderingContext2D> = {};

const sets: Record<
  string,
  { canvases: typeof canvases; contexts: typeof contexts }
> = {};

let defaultWidth = 0;
let defaultHeight = 0;

const outputCanvas = document.getElementById(
  "output_full"
) as HTMLCanvasElement;
canvases.output = outputCanvas;
contexts.output = prepareContext(outputCanvas.getContext("2d")!);

export function prepareContext(context: CanvasRenderingContext2D) {
  context.imageSmoothingEnabled = false;
  return context;
}

function create(name: string, canvasSet = canvases, contextSet = contexts) {
  var canvas = document.createElement("canvas");
  if (canvasSet === canvases) {
    canvas.height = defaultHeight * settings.scales[name];
    canvas.width = defaultWidth * settings.scales[name];
  }
  (canvases || canvasSet)[name] = canvas;
  (contexts || contextSet)[name] = canvas.getContext("2d")!;
}

export const getCanvas = function (name: string, setName?: string) {
  var canvasSet = canvases;
  var contextSet = contexts;
  if (setName) {
    if (!sets[setName]) {
      sets[setName] = { canvases: {}, contexts: {} };
    }
    canvasSet = sets[setName].canvases;
    contextSet = sets[setName].contexts;
  }
  if (!(name in canvasSet)) {
    create(name, canvasSet, contextSet);
  }
  return canvasSet[name];
};

export const getContext = function (name: string, setName?: string) {
  var canvasSet = canvases;
  var contextSet = contexts;
  if (setName) {
    if (!sets[setName]) {
      sets[setName] = { canvases: {}, contexts: {} };
    }
    canvasSet = sets[setName].canvases;
    contextSet = sets[setName].contexts;
  }
  if (!(name in contextSet)) {
    create(name, canvasSet, contextSet);
  }

  return prepareContext(contextSet[name]);
};

export const setSizes = function (width: number, height: number) {
  defaultWidth = width;
  defaultHeight = height;
  for (var c in canvases) {
    if (c === "output") continue; // Don't scale output
    canvases[c].height = height * settings.scales[c];
    canvases[c].width = width * settings.scales[c];
  }
};
