import React from 'react'
import ColorPicker from './ColorPicker'

function PenTool({setPenOptions,callBack}) {
  return (
    <div>
        <button onClick={()=>setPenOptions(true)}>Pen</button>
        <ColorPicker callback={callBack}/>
    </div>
  )
}

export default PenTool