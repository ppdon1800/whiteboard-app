import React from "react";
import ColorPicker from "./ColorPicker";

function PenTool({
  setPenOptions,
  callBack,
  callBack2,
  setInputBox,
  setIsDrawing,
}) {
  return (
    <div>
      <button
        onClick={() => {
          setPenOptions(true);
          setInputBox(false);
          setIsDrawing("pen");
        }}
      >
        Pen
      </button>
      <ColorPicker callback={callBack} />
      <input onChange={callBack2} type="range" min="1" max="10" />
    </div>
  );
}

export default PenTool;
