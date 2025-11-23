import React, { useRef, useEffect, useState } from "react";
import "./canvas.css";
import Undo from "./ui/Undo";
import Redo from "./ui/Redo";
import PenTool from "./ui/PenTool";
import LeftSideBar from "./ui/LeftSideBar";
import ColorPicker from "./ui/ColorPicker";
import { distance } from "../../utils/utils";

function Canvas() {
  const canvasRef = useRef(null);
  const currentColor = useRef("#000000");
  const PATHS = useRef([]);
  const drawRef = useRef(null);
  const redoStack = useRef([]);
  const strokeWidth = useRef(2);
  const Eraser = useRef(false);
  const SoftEraser = useRef(false);
  const FONT = useRef("30px sans-serif")
  const [penOptions, setPenOptions] = useState(false);
  const [isInputBox, setInputBox] = useState(false);
  const [awaitText, setAwaitText] = useState(false);
  const [textpos, setTextPos] = useState([100, 100]);
  const [isDrawing, setIsDrawing] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // drawing state (kept inside effect so it's tied to this canvas instance)
    let mouseDown = false;
    const paths = PATHS.current; // array of paths; each path is array of [x,y]
    let currentPath = null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // make canvas sized to window initially (DPI-aware)
    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      // use CSS size from viewport
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);

      // scale drawing so we can use CSS pixels for coordinates
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      redraw();
    };

    // redraw all stored paths and the active path
    function redraw() {
      // canvas.width/height are in device pixels; our drawing coordinates
      // use CSS pixels because we scaled the context by devicePixelRatio.
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
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
        } else {
          if (p.type === "text") {
            ctx.font = p.font;
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.position[0], p.position[1]);
          }
        }
      }
    }
    // expose redraw so outside handlers (buttons) can clear/redraw
    drawRef.current = redraw;
    function drawCurrentPath() {
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
    function hardEraser(e) {
      const eraserRadius = 10;
      const mousePos = getPos(e);
      for (const path of paths) {
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
    function softEraser(e) {
      const eraserRadius = 10;
      const mousePos = getPos(e); // This returns [x, y]
      const newPaths = [];

      // Iterate over all existing paths
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const oldPoints = path.path; // array of [x, y] points

        let currentSegment = [];

        for (let j = 0; j < oldPoints.length; j++) {
          const point = oldPoints[j]; // [x, y]

          // Check if the point is outside the eraser's radius (i.e., keep it)
          // The distance function must correctly handle two [x, y] arrays!
          if (distance(mousePos, point) > eraserRadius) {
            // Point is kept, add it to the current segment
            currentSegment.push(point);
          } else {
            // Point is being erased (a gap is created)

            // If the current segment has points, it is a complete path segment.
            if (currentSegment.length > 0) {
              // Save the completed continuous segment as a new path
              newPaths.push({
                color: path.color, // Preserve path style/metadata
                width: path.width,
                path: currentSegment,
              });
            }

            // Start a new empty segment for the points that follow the gap
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

      // Replace the global paths array with the new, split paths
      // Use length = 0 to clear the array reference without changing PATHS.current
      paths.length = 0;
      paths.push(...newPaths);

      redraw();
    }
    // event handlers (named so they can be removed later)
    // get pointer position in CSS pixels relative to the canvas
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onMouseDown = (e) => {
      mouseDown = true;
      currentPath = [getPos(e)];
      redraw();
      setTextPos(getPos(e));
      if (awaitText){
        console.log('first')
        setInputBox(!isInputBox);
      }
    };

    const onMouseMove = (e) => {
      if (!mouseDown) return;
      if (penOptions) {
        currentPath.push(getPos(e));
        drawCurrentPath();
      }

      if (Eraser.current) {
        hardEraser(e);
      }
      if (SoftEraser.current) {
        softEraser(e);
      }
      
    };

    const onMouseUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      const p = {
        color: currentColor.current,
        width: strokeWidth.current,
        path: currentPath,
      };
      if (currentPath && currentPath.length > 0 && penOptions) paths.push(p);
      currentPath = null;
      redraw();
    };

    // wire handlers
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("resize", setSize);

    // initialize size
    setSize();

    // cleanup uses same function references
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", setSize);
      drawRef.current = null;
    };
  }, [penOptions,isInputBox,awaitText]);

  const pickColor = (e) => {
    console.log(e.target.value);
    currentColor.current = e.target.value;
  };
  const setStrokeWidth = (e) => {
    strokeWidth.current = e.target.value;
  };
  const setText = (e) => {
    // if (e.key !== "Enter") return;
    PATHS.current.push({
        type: 'text',
      text: e.target.value,
      position: [textpos[0], textpos[1]],
      color: currentColor.current,
      font: FONT.current,
    });
    console.log(PATHS.current);
    e.target.value = "";
    drawRef.current();
  };
  return (
    <div>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
      ></canvas>

      {isInputBox && (
        <input
          style={{
            position: "absolute",
            top: textpos[1] + "px",
            left: textpos[0] + "px",
            zIndex: 10,
          }}
          autoFocus
          onKeyDown={(e)=>{(e.key === "Enter") && setText(e)}}
          onBlur={(e)=>{
            e.target.value && setText(e);
            //setInputBox(!isInputBox);
            //setAwaitText(!awaitText);
          }}
          type="text"
        />
      )}
      <button onClick={() => {setAwaitText(!awaitText);
        setPenOptions(false);
        Eraser.current= false;
        SoftEraser.current = false;
      }}>Text</button>
      <button
        onClick={() => {
          PATHS.current.length = 0;
          if (drawRef.current) drawRef.current();
        }}
      >
        clear
      </button>
      <button onClick={()=>setIsDrawing('line')}>Line</button>
      <Undo PATHS={PATHS} redoStack={redoStack} drawRef={drawRef} />
      <Redo PATHS={PATHS} redoStack={redoStack} drawRef={drawRef} />
      <PenTool
        setPenOptions={setPenOptions}
        callBack={pickColor}
        callBack2={setStrokeWidth}
        eraser={Eraser}
        softEraser={SoftEraser}
        setInputBox={setInputBox}
      />
      <button
        onClick={() => {
          Eraser.current = true;
          setPenOptions(false);
          SoftEraser.current = false;
          setInputBox(false);
        }}
      >
        Eraser
      </button>
      <button
        onClick={() => {
          SoftEraser.current = true;
          setPenOptions(false);
          Eraser.current = false;
          setInputBox(false);
        }}
      >
        SoftEraser
      </button>

      <LeftSideBar penOptions={penOptions} />
    </div>
  );
}

export default Canvas;
