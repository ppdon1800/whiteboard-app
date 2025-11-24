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
  const FONT = useRef("30px sans-serif");
  const inputRef = useRef(null);
  const [penOptions, setPenOptions] = useState(false);
  const [isInputBox, setInputBox] = useState(false);
  const [awaitText, setAwaitText] = useState(false);
  const [textpos, setTextPos] = useState([100, 100]);
  const [isDrawing, setIsDrawing] = useState("");

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
    function softEraser(e) {
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

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onMouseDown = (e) => {
      if (awaitText) {
        // Stop propagation to prevent immediate closing by outside click handlers
        e.stopPropagation();
        setTextPos(getPos(e));
        setInputBox(true);
        setAwaitText(false);
        return;
      }

      mouseDown = true;
      currentPath = [getPos(e)];
      redraw();
    };

    const onMouseMove = (e) => {
      if (!mouseDown) return;
      if (isDrawing === "pen") {
        currentPath.push(getPos(e));
        drawCurrentPath();
      }

      if (isDrawing === 'eraser') {
        hardEraser(e);
      }
      if (isDrawing === 'softEraser') {
        softEraser(e);
      }
      if (isDrawing === "line") {
        const mousePos = getPos(e);
        currentPath = [
          [currentPath[0][0], currentPath[0][1]],
          [mousePos[0], mousePos[1]],
        ];

        redraw();
        drawCurrentPath();
      }
      if(isDrawing === "rect") {
        const mousePos = getPos(e);
        ctx.beginPath();
        const rectWidth = mousePos[0] - currentPath[0][0];
        const rectHeight = mousePos[1] - currentPath[0][1];
        ctx.rect(currentPath[0][0], currentPath[0][1], rectWidth, rectHeight);
        ctx.strokeStyle = currentColor.current;
        ctx.lineWidth = strokeWidth.current;
        ctx.stroke();
      }
    };

    const onMouseUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      if (isDrawing === "pen") {
        const p = {
          color: currentColor.current,
          width: strokeWidth.current,
          path: currentPath,
        };
        if (currentPath && currentPath.length > 0 && penOptions) paths.push(p);
        currentPath = null;
      }

      if (isDrawing === "line") {
        const linePath = {
          type: "line",
          color: currentColor.current,
          width: strokeWidth.current,
          start: [currentPath[0][0], currentPath[0][1]],
          end: [currentPath[1][0], currentPath[1][1]],
          path:currentPath,
        };
        paths.push(linePath);
      }
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
  }, [penOptions, isInputBox, awaitText, isDrawing]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isInputBox) {
        const inputEl = inputRef.current;
        if (!inputEl || !inputEl.contains(e.target)) {
          setInputBox(false);
          setAwaitText(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isInputBox]);

  const pickColor = (e) => {
    console.log(e.target.value);
    currentColor.current = e.target.value;
  };
  const setStrokeWidth = (e) => {
    strokeWidth.current = e.target.value;
  };
  const setText = (e) => {
    if (!e.target.value.trim()) return;

    PATHS.current.push({
      type: "text",
      text: e.target.value,
      position: [textpos[0], textpos[1]],
      color: currentColor.current,
      font: FONT.current,
    });

    console.log(PATHS.current);
    if (drawRef.current) drawRef.current();
  };

  return (
    // CHANGED: Added position relative here so the absolute input aligns with canvas
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
      ></canvas>

      {isInputBox && (
        <input
          style={{
            // CHANGED: Fixed -> Absolute to match canvas coordinates
            position: "absolute",
            top: `${textpos[1]}px`,
            left: `${textpos[0]}px`,
            // CHANGED: Increased zIndex significantly to ensure visibility
            zIndex: 9999,
            fontSize: "30px",
            fontFamily: "sans-serif",
            border: "2px solid #161414ff",
            padding: "5px",
            background: "white",
            color: currentColor.current, // Optional: match current color
          }}
          ref={inputRef}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setText(e);
              setInputBox(false);
              setAwaitText(false);
            }
            if (e.key === "Escape") {
              setInputBox(false);
              setAwaitText(false);
            }
          }}
          defaultValue=""
        />
      )}

      <div style={{ position: "fixed", top: 0, left: 0, zIndex: 1000 }}>
        {/* Wrapped buttons in a fixed container so they don't flow under canvas */}
        <button
          onClick={() => {
            setAwaitText(true);
            setPenOptions(false);
            setIsDrawing("");
          }}
        >
          Text
        </button>
        <button
          onClick={() => {
            PATHS.current.length = 0;
            if (drawRef.current) drawRef.current();
          }}
        >
          clear
        </button>
        <button
          onClick={() => {
            setIsDrawing("line");
            setPenOptions(false);
            setInputBox(false);
          }}
        >
          Line
        </button>
        <button
          onClick={() => {
            setIsDrawing("eraser");
            setPenOptions(false);
            setInputBox(false);
          }}
        >
          Eraser
        </button>
        <button
          onClick={() => {
            setIsDrawing('softEraser');
            setPenOptions(false);
            setInputBox(false);
          }}
        >
          SoftEraser
        </button>
        <button onClick={()=>setIsDrawing('rect')}>Rect</button>
      </div>

      <Undo PATHS={PATHS} redoStack={redoStack} drawRef={drawRef} />
      <Redo PATHS={PATHS} redoStack={redoStack} drawRef={drawRef} />
      <PenTool
        setPenOptions={setPenOptions}
        callBack={pickColor}
        callBack2={setStrokeWidth}
        setInputBox={setInputBox}
        setIsDrawing={setIsDrawing}
      />

      <LeftSideBar penOptions={penOptions} />
    </div>
  );
}

export default Canvas;
