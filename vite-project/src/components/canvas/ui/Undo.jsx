
function Undo({ PATHS, redoStack, drawRef }) {
    return (
        <button onClick={() => {
            if (PATHS.current.length === 0) return;
            // remove the last path
            const lastPath = PATHS.current.pop();
            redoStack.current.push(lastPath);
            // call redraw exposed from the effect to clear the canvas
            if (drawRef.current) drawRef.current();
        }} >Undo</button>
    )
}

export default Undo