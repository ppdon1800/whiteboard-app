

function Redo({ PATHS, redoStack, drawRef }) {
    return (
        <button onClick={() => {
            if (redoStack.current.length === 0) return;
            // redo the last undone path
            const path = redoStack.current.pop();
            PATHS.current.push(path);
            // call redraw exposed from the effect to clear the canvas
            if (drawRef.current) drawRef.current();
        }} >Redo</button>
    )
}

export default Redo