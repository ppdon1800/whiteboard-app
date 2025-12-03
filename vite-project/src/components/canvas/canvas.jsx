import React, { useRef, useEffect, useState } from "react";
import "./canvas.css";
import Undo from "./ui/Undo";
import Redo from "./ui/Redo";
import PenTool from "./ui/PenTool";
import LeftSideBar from "./ui/LeftSideBar";
import ColorPicker from "./ui/ColorPicker";
import { distance } from "../../utils/utils";
import {
  reDraw,
  DrawCurrentPath,
  drawRect,
  drawCircle,
  HardEraser,
  SoftEraser,
  drawStepArrow,
} from "../../utils/draw";

function Canvas() {
  const canvasRef = useRef(null);
  const currentColor = useRef("#000000");
  const PATHS = useRef([]);
  const drawRef = useRef(null);
  const panOffset = useRef([0, 0]);
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
    let obj = null;

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
      reDraw(
        ctx,
        canvas,
        PATHS.current,
        currentColor,
        drawStepArrow,
        panOffset.current
      );
    }
    // expose redraw so outside handlers (buttons) can clear/redraw
    drawRef.current = redraw;
    function drawCurrentPath() {
      DrawCurrentPath(ctx, currentPath, currentColor, strokeWidth);
    }
    // helper to draw temporary previews using the same pan translation
    function withPanDraw(fn) {
      ctx.save();
      ctx.translate(panOffset.current[0], panOffset.current[1]);
      try {
        fn();
      } finally {
        ctx.restore();
      }
    }
    function hardEraser(e) {
      HardEraser(e, PATHS.current, getPos, redraw, distance, redoStack);
    }
    function softEraser(e) {
      SoftEraser(e, PATHS.current, getPos, redraw);
    }

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Subtract pan offset for new drawing coordinates
      if (isDrawing !== "pantool") {
        x -= panOffset.current[0];
        y -= panOffset.current[1];
      }

      return [x, y];
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
        withPanDraw(() => drawCurrentPath());
      }

      if (isDrawing === "eraser") {
        hardEraser(e);
      }
      if (isDrawing === "softEraser") {
        softEraser(e);
      }
      if (isDrawing === "line") {
        const mousePos = getPos(e);
        currentPath = [
          [currentPath[0][0], currentPath[0][1]],
          [mousePos[0], mousePos[1]],
        ];

        redraw();
        withPanDraw(() => drawCurrentPath());
      }
      if (isDrawing === "rect") {
        redraw();
        withPanDraw(() => {
          obj = drawRect(e, ctx, currentPath, currentColor, getPos, strokeWidth);
        });
      }
      if (isDrawing === "circle") {
        redraw();
        withPanDraw(() => {
          obj = drawCircle(
            e,
            ctx,
            currentPath,
            currentColor,
            getPos,
            strokeWidth
          );
        });
      }
      if (isDrawing === "arrow") {
        redraw();
        const mousePos = getPos(e);
        // drawArrow(ctx, currentPath[0], mousePos);
        withPanDraw(() => drawStepArrow(ctx, currentPath[0], mousePos));
        const arrowPath = {
          type: "arrow",
          color: currentColor.current,
          width: strokeWidth.current,
          start: currentPath[0],
          end: mousePos,
        };
        obj = arrowPath;
      }
      if (isDrawing === "pantool") {
        const mousePos = getPos(e);
        const dx = mousePos[0] - currentPath[0][0];
        const dy = mousePos[1] - currentPath[0][1];
        panOffset.current[0] += dx;
        panOffset.current[1] += dy;

        currentPath = [mousePos];
        redraw();
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
          path: currentPath,
        };
        paths.push(linePath);
      }
      if (isDrawing === "rect") {
        paths.push(obj);
        currentPath = null;
      }
      if (isDrawing === "circle") {
        paths.push(obj);
        currentPath = null;
      }
      if (isDrawing === "arrow") {
        paths.push(obj);
        currentPath = null;
      }
      if (isDrawing === "pantool") {
        // isPanning = false;
        currentPath = null;
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
            color: "#ffffff", // Optional: match current color
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
            setIsDrawing("softEraser");
            setPenOptions(false);
            setInputBox(false);
          }}
        >
          SoftEraser
        </button>
        <button onClick={() => setIsDrawing("rect")}>Rect</button>
        <button onClick={() => setIsDrawing("circle")}>Circle</button>
        <button onClick={() => setIsDrawing("arrow")}>Arrow</button>
        <button onClick={() => setIsDrawing("pantool")}>Pan Tool</button>
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
