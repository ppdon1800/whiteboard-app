import { distance } from "./utils.js";
function reDraw(ctx, canvas, paths, currentColor, drawStepArrow, panOffset) {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  ctx.save();
  ctx.translate(panOffset[0], panOffset[1]);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = currentColor.current;
  ctx.lineWidth = 2;

  for (const p of paths) {
    if (p.type != "text" && p.path) {
      const l = p.path.length;
      if (!p || l === 0) continue;
      ctx.beginPath();
      ctx.moveTo(p.path[0][0], p.path[0][1]);
      for (let i = 1; i < l; i++) ctx.lineTo(p.path[i][0], p.path[i][1]);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.stroke();
    } else if (p.type === "text") {
      ctx.font = p.font;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.position[0], p.position[1]);
    } else if (p.type === "line") {
      ctx.beginPath();
      ctx.moveTo(p.start[0], p.start[1]);
      ctx.lineTo(p.end[0], p.end[1]);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.stroke();
    } else if (p.type === "rect") {
      ctx.beginPath();
      ctx.rect(p.x, p.y, p.rectWidth, p.rectHeight);
      // fill then stroke so shape has color
      ctx.fillStyle = p.fill || p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.fill();
      ctx.stroke();
    } else if (p.type === "circle") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
      ctx.fillStyle = p.fill || p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.fill();
      ctx.stroke();
    } else if (p.type === "arrow") {
      drawStepArrow(ctx, p.start, p.end, p.color, 20);
    }
  }
  ctx.restore();
}

function DrawCurrentPath(ctx, currentPath, currentColor, strokeWidth) {
  if (currentPath && currentPath.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = currentColor.current;
    ctx.lineWidth = strokeWidth.current;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++)
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);

    ctx.stroke();
  }
}

function drawRect(e, ctx, currentPath, currentColor, getPos, strokeWidth) {
    const mousePos = getPos(e);
        ctx.beginPath();
        const rectWidth = mousePos[0] - currentPath[0][0];
        const rectHeight = mousePos[1] - currentPath[0][1];
        ctx.rect(currentPath[0][0], currentPath[0][1], rectWidth, rectHeight);
        ctx.strokeStyle = currentColor.current;
        ctx.lineWidth = strokeWidth.current;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        // use current color as fill for preview
        ctx.fillStyle = currentColor.current;
        ctx.fill();
        ctx.stroke();
        const rectPath = {
          type: "rect",
          color: currentColor.current,
          width: strokeWidth.current,
          rectHeight: rectHeight,
          rectWidth: rectWidth,
          fill: currentColor.current,
          x: currentPath[0][0],
          y: currentPath[0][1],
        };
        return rectPath;
}

function drawCircle(e, ctx, currentPath, currentColor, getPos, strokeWidth) {
    const mousePos = getPos(e);
        const radius = distance(mousePos, currentPath[0]);
        ctx.beginPath();
        ctx.arc(...mousePos, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = currentColor.current;
        ctx.lineWidth = strokeWidth.current;
        // use current color for circle fill preview
        ctx.fillStyle = currentColor.current;
        ctx.fill();
        ctx.stroke();
        const circlePath = {
          type: "circle",
          color: currentColor.current,
          width: strokeWidth.current,
          radius: radius,
          fill: currentColor.current,
          x: mousePos[0],
          y: mousePos[1],
        };
        return circlePath;
}

function HardEraser(e, paths, getPos, redraw, distance, redoStack) {
    const eraserRadius = 10;
      const mousePos = getPos(e);
      for (const path of paths) {
        // skip non-drawable entries (text, lines without point arrays)
        if (!path.path || !Array.isArray(path.path)) continue;
        for (const point of path.path) {
          const d = distance(mousePos, point);
          if (d < eraserRadius) {
            const index = paths.indexOf(path);
            if (index > -1) {
              const p = paths.splice(index, 1);
              redoStack.current.push(p[0]);
              redraw();
              return;
            }
          }
        }
      }
      console.log("Erassing");
}

function SoftEraser(e, paths, getPos, redraw) {
    const eraserRadius = 10;
      const mousePos = getPos(e); // This returns [x, y]
      const newPaths = [];

      // Iterate over all existing paths
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        // skip non-drawable entries
        if (!path.path || !Array.isArray(path.path)) continue;
        const oldPoints = path.path; // array of [x, y] points

        let currentSegment = [];

        for (let j = 0; j < oldPoints.length; j++) {
          const point = oldPoints[j]; // [x, y]

          if (distance(mousePos, point) > eraserRadius) {
            // Point is kept, add it to the current segment
            currentSegment.push(point);
          } else {
            // Point is being erased (a gap is created)
            if (currentSegment.length > 0) {
              newPaths.push({
                color: path.color,
                width: path.width,
                path: currentSegment,
              });
            }
            currentSegment = [];
          }
        }

        // After the inner loop, check if the last segment has points
        if (currentSegment.length > 0) {
          newPaths.push({
            color: path.color,
            width: path.width,
            path: currentSegment,
          });
        }
      }

      paths.length = 0;
      paths.push(...newPaths);
      redraw();
}

function drawArrow(ctx, from, to) {
  const headLength = 10; // length of head in pixels
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.lineTo(
    to[0] - headLength * Math.cos(angle - Math.PI / 6),
    to[1] - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(
    to[0] - headLength * Math.cos(angle + Math.PI / 6),
    to[1] - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}
function drawStepArrow(ctx, p1, p2, color = "#4a90e2", radius = 20) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const theta = Math.tanh(Math.PI/90);
  if(Math.tanh(Math.abs((y2 - y1)/(x2 - x1)) ) < theta ){
    drawArrow(ctx, p1, p2);
    return;
  }
  if (Math.abs(x2 - x1) < Math.abs(y2 - y1)) {
    // More vertical distance: use vertical step arrow
    drawVerticalStepArrow(ctx, p1, p2, color, radius);
    return;
  }
  // Calculate the horizontal midpoint for the "step"
  const mx = (x1 + x2) / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Move to Start
  ctx.moveTo(x1, y1);

  // 2. Draw path with rounded corners
  // First curve: Go horizontal to midpoint, then curve vertical
  ctx.arcTo(mx, y1, mx, y2, radius);

  // Second curve: Go vertical to target height, then curve horizontal
  ctx.arcTo(mx, y2, x2, y2, radius);

  // Finish the line to the end point
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 3. Draw Arrow Head (Open V shape)
  const headLen = 12; // Length of arrow wings
  // Determine angle: 0 if going right, PI if going left
  const angle = Math.atan2(0, x2 - mx);

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();

  // 4. Draw Start Circle (Hollow)
  ctx.beginPath();
  ctx.arc(x1, y1, 4, 0, Math.PI * 2); // 4px radius
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();

  // Optional: Draw End Circle (if you want the node-to-node look)
  ctx.beginPath();
  ctx.arc(x2, y2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();

}
 function drawVerticalStepArrow(ctx, p1, p2, color = "#4a90e2", radius = 20) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  // Calculate the vertical midpoint (where the horizontal cross-bar will be)
  const my = (y1 + y2) / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Move to Start
  ctx.moveTo(x1, y1);

  // 2. Draw the path with rounded corners
  // First curve: Go vertical to midpoint, then curve horizontal
  // arcTo(controlX, controlY, endX, endY, radius)
  ctx.arcTo(x1, my, x2, my, radius);

  // Second curve: Go horizontal to target x, then curve vertical
  ctx.arcTo(x2, my, x2, y2, radius);

  // Finish the line to the end point
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 3. Draw Arrow Head (Standard V shape)
  const headLen = 12;
  // Determine direction (up or down) for the arrow head
  const angle = Math.atan2(y2 - my, 0);

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();

  // 4. Draw Start and End Circles (Nodes)
  // Start Node
  ctx.beginPath();
  ctx.arc(x1, y1, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();

  // End Node
  ctx.beginPath();
  ctx.arc(x2, y2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();
}
export { reDraw, DrawCurrentPath , drawRect, drawCircle , HardEraser, SoftEraser, drawArrow, drawStepArrow };
