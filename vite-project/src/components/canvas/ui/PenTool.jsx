import React from 'react'
import ColorPicker from './ColorPicker'

function PenTool({setPenOptions,callBack,callBack2,eraser: eraserRef , softEraser: softEraserRef}) {
  return (
    <div>
        <button onClick={()=>{setPenOptions(true);
          eraserRef.current = false; softEraserRef.current = false;}}>Pen</button>
        <ColorPicker callback={callBack}/>
        <input onChange={callBack2} type="range" min="1" max="10" />
    </div>
  )
}

export default PenTool