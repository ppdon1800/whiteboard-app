import React from 'react'

function ColorPicker({callback}) {
  return (
    <div>
        <input onInput={callback} type="color" />
    </div>
  )
}

export default ColorPicker