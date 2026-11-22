import { useState, useEffect, useRef, FC } from 'react'
import './AutocompleteInput.css'

interface InputProps {
        value: string
        other: string | null
        suggestionsFunction: (searchTerm: string, other: string | null) => Promise<string[]>
        onValueChange: (value: string, other: string | null, newVal: string) => void
}

const debounceMs = 250

const AutocompleteInput: FC<InputProps> = ({ value, other, suggestionsFunction, onValueChange }) => {
    const [innerValue, setInnerValue] = useState<string>(value)
    // sync with the value prop during render (no effect): see "adjusting state when a prop changes"
    const [prevValue, setPrevValue] = useState<string>(value)
    if (value !== prevValue) {
        setPrevValue(value)
        setInnerValue(value)
    }
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [cursor, setCursor] = useState(-1)
    const containerRef = useRef<HTMLDivElement | null>(null)
    // only the latest request may show suggestions: a late response (after a selection,
    // a blur or newer typing) would reopen the list
    const requestId = useRef(0)
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const focused = useRef(false)

    useEffect(() => {
        return () => clearTimeout(debounceTimer.current) // unmount
    }, [])

    // the parent is notified from the handlers that change the text (typing, selection)
    const changeValue = (newVal: string) => {
        setInnerValue(newVal)
        onValueChange(value, other, newVal)
    }

    // close the list and drop pending or in-flight requests
    const closeSuggestions = () => {
        requestId.current++
        clearTimeout(debounceTimer.current)
        setSuggestions([])
        setCursor(-1)
    }

    const fetchSuggestions = (val: string) => {
        const id = ++requestId.current
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(async () => {
            try {
                const newSuggestions = await suggestionsFunction(val, other)
                if (id === requestId.current && focused.current) {
                    setSuggestions(newSuggestions)
                    setCursor(-1)
                }
            } catch (error) {
                console.error('autocomplete error', error)
            }
        }, debounceMs)
    }

    const onInput = (val: string) => {
        changeValue(val)
        fetchSuggestions(val)
    }

    const selectItem = (suggestion: string | undefined) => {
        if (suggestion) {
            changeValue(suggestion)
            closeSuggestions()
        }
    }

    const enter = () => {
        if (suggestions.length > 0) {
            selectItem(suggestions[cursor])
        }
    }

    // move the highlighted suggestion, from -1 (none) to the last one, and keep it visible
    const moveCursor = (newCursor: number) => {
        setCursor(newCursor)
        const suggestionElements = containerRef.current?.getElementsByClassName('suggestion')
        suggestionElements?.[newCursor]?.scrollIntoView({ block: 'nearest' })
    }

    const up = () => {
        if (cursor > -1) moveCursor(cursor - 1)
    }

    const down = () => {
        if (suggestions.length === 0) {
            fetchSuggestions(innerValue)
        } else if (cursor < suggestions.length - 1) {
            moveCursor(cursor + 1)
        }
    }

    const escape = () => {
        closeSuggestions()
    }

    const blur = () => {
        focused.current = false
        requestId.current++ // a response arriving after the blur must not reopen the list
        clearTimeout(debounceTimer.current)
        setTimeout(() => setSuggestions([]), 200) // delay: let a click on a suggestion happen first
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
                onFocus={() => { focused.current = true }}
                onBlur={blur}
            />
            {suggestions.length > 0 && (
                <ul className="suggestions">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            className={`suggestion ${index === cursor ? 'suggestion-hovered' : ''}`}
                            onMouseDown={(e) => e.preventDefault()} // keep the focus in the input
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