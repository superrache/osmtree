import { useState, useEffect, useRef, FC } from 'react'
import './AutocompleteInput.css'

interface InputProps {
    value: string
    other: string | null
    suggestionsFunction: (searchTerm: string, other: string | null) => Promise<string[]>
    onValueChange: (value: string, other: string | null, newVal: string) => void
}

const AutocompleteInput: FC<InputProps> = ({ value, other, suggestionsFunction, onValueChange }) => {
  const [innerValue, setInnerValue] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [cursor, setCursor] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    onValueChange(value, other, innerValue)
  }, [innerValue])
  
  useEffect(() => {
    setInnerValue(value)
  }, [value])

  const onInput = async (val: string) => {
    console.log('onInput', val, other)
    setInnerValue(val)
    const newSuggestions = await suggestionsFunction(innerValue, other)
    setSuggestions(newSuggestions)
  }

  const selectItem = (suggestion: string) => {
    if (suggestion) {
      setInnerValue(suggestion)
      onInput(suggestion)
      setSuggestions([])
    }
  }

  const enter = () => {
    if (suggestions.length > 0) {
      selectItem(suggestions[cursor])
    }
  }

  const up = () => {
    if (cursor > -1 && containerRef.current) {
      setCursor(cursor - 1)
      const suggestionElements = containerRef.current.getElementsByClassName('suggestion')
      if (suggestionElements[cursor]) {
        suggestionElements[cursor].scrollIntoView({ block: 'nearest' })
      }
    }
  }

  const down = () => {
    if (suggestions.length === 0) {
        onInput(innerValue)
    } else if (cursor < suggestions.length && containerRef.current) {
      setCursor(cursor + 1)
      const suggestionElements = containerRef.current.getElementsByClassName('suggestion')
      if (suggestionElements[cursor]) {
        suggestionElements[cursor].scrollIntoView({ block: 'nearest' })
      }
    }
  }

  const escape = () => {
    setSuggestions([]);
  }

  const blur = () => {
    setTimeout(() => setSuggestions([]), 200)
  }

  return (
    <div id="container" ref={containerRef}>
      <input
        type="search"
        value={innerValue}
        onChange={(e) => onInput(e.target.value)}
        onKeyUp={(e) => {
          if (e.key === 'Escape') {
            escape()
          } else if (e.key === 'Enter') {
            enter()
          } else if (e.key === 'Tab') {
            enter()
          } else if (e.key === 'ArrowUp') {
            up()
          } else if (e.key === 'ArrowDown') {
            down()
          }
        }}
        onBlur={blur}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`suggestion ${index === cursor ? 'suggestion-hovered' : ''}`}
              onClick={() => selectItem(suggestion)}
              onMouseOver={() => setCursor(index)}
            >
              <div>{suggestion}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AutocompleteInput