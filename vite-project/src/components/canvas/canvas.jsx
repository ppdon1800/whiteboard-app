import React, { useRef, useEffect, useState } from "react";
import "./canvas.css";
import Undo from "./ui/Undo";
import Redo from "./ui/Redo";
import PenTool from "./ui/PenTool";
import LeftSideBar from "./ui/LeftSideBar";
import ColorPicker from './ui/ColorPicker'

function Canvas() {
    const canvasRef = useRef(null);
    const currentColor = useRef("#000000");
    const PATHS = useRef([]);
    const drawRef = useRef(null);
    const redoStack = useRef([]);
    const [penOptions, setPenOptions] = useState(false);


    useEffect(() => {
        const canvas = canvasRef.current;
        let strokeWidth = 2;
        if (!canvas) return;
        // drawing state (kept inside effect so it's tied to this canvas instance)
        let mouseDown = false;
         const paths =PATHS.current  // array of paths; each path is array of [x,y]
        let currentPath = null

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // make canvas sized to window initially (DPI-aware)
        const setSize = () => {
            const dpr = window.devicePixelRatio || 1
            // use CSS size from viewport
            const cssWidth = window.innerWidth
            const cssHeight = window.innerHeight

            canvas.style.width = cssWidth + 'px'
            canvas.style.height = cssHeight + 'px'

            canvas.width = Math.round(cssWidth * dpr)
            canvas.height = Math.round(cssHeight * dpr)

            // scale drawing so we can use CSS pixels for coordinates
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            redraw()
        }

        // redraw all stored paths and the active path
        function redraw() {
            // canvas.width/height are in device pixels; our drawing coordinates
            // use CSS pixels because we scaled the context by devicePixelRatio.
            const dpr = window.devicePixelRatio || 1
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'
            ctx.strokeStyle = currentColor.current
            ctx.lineWidth = 2

            for (const p of paths) {
                const l = p.path.length;
                if (!p || l === 0) continue
                ctx.beginPath()
                ctx.moveTo(p.path[0][0], p.path[0][1])
                for (let i = 1; i < l; i++) ctx.lineTo(p.path[i][0], p.path[i][1])
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.width;
                ctx.stroke()
            }
        }
        // expose redraw so outside handlers (buttons) can clear/redraw
        drawRef.current = redraw
        function drawCurrentPath() {
            if (currentPath && currentPath.length > 0) {
                ctx.beginPath()
                ctx.moveTo(currentPath[0][0], currentPath[0][1])
                for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i][0], currentPath[i][1])
                ctx.strokeStyle = currentColor.current;
                ctx.lineWidth = strokeWidth;
                ctx.stroke()
            }
        }
        // event handlers (named so they can be removed later)
        // get pointer position in CSS pixels relative to the canvas
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect()
            return [e.clientX - rect.left, e.clientY - rect.top]
        }

        const onMouseDown = (e) => {
            mouseDown = true
            currentPath = [getPos(e)]
            redraw()
        }

        const onMouseMove = (e) => {
            if (!penOptions) return;
            if (!mouseDown) return
            currentPath.push(getPos(e))
            drawCurrentPath();
        }

        const onMouseUp = () => {
            if (!mouseDown) return
            mouseDown = false
            const p = { color: currentColor.current, width: strokeWidth, path: currentPath }
            if (currentPath && currentPath.length > 0) paths.push(p)
            currentPath = null
            redraw()
        }

        // wire handlers
        canvas.addEventListener('mousedown', onMouseDown)
        canvas.addEventListener('mousemove', onMouseMove)
        canvas.addEventListener('mouseup', onMouseUp)
        window.addEventListener('resize', setSize)

        // initialize size
        setSize()

        // cleanup uses same function references
        return () => {
            canvas.removeEventListener('mousedown', onMouseDown)
            canvas.removeEventListener('mousemove', onMouseMove)
            canvas.removeEventListener('mouseup', onMouseUp)
            window.removeEventListener('resize', setSize)
            drawRef.current = null
        }
    }, [penOptions]);

    const pickColor = (e) => {
        console.log(e.target.value);
        currentColor.current = e.target.value;
    };
    return (
        <div>
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
            >
            </canvas>

            <button onClick={() =>{
                PATHS.current.length = 0;
                if (drawRef.current) drawRef.current();
            }}>clear</button>
            <Undo PATHS={PATHS} redoStack={redoStack} drawRef={drawRef} />
            <Redo PATHS={PATHS} redoStack={redoStack} drawRef={drawRef} />
            <PenTool setPenOptions={setPenOptions} callBack={pickColor} />
            <LeftSideBar penOptions={penOptions} />
        </div>
    );
}

export default Canvas;
