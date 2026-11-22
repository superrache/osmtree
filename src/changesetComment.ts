// English changeset comment summarizing the edits, e.g.
// "Add 3 trees and 1 shrub; update 2 trees; delete 1 plant"

type Action = 'add' | 'update' | 'delete'

export type CommentedEdit = {
    action: Action
    natural: string | undefined // natural=* value (tree, shrub, plant…)
}

const actionVerbs: Record<Action, string> = { add: 'Add', update: 'update', delete: 'delete' }

// English nouns of the natural types (the comment stays in English whatever the UI language)
const naturalNouns: Record<string, [string, string]> = {
    tree: ['tree', 'trees'],
    shrub: ['shrub', 'shrubs'],
    plant: ['plant', 'plants']
}
const otherNoun: [string, string] = ['feature', 'features']

const countNoun = (count: number, natural: string | undefined) => {
    const [singular, plural] = (natural !== undefined && naturalNouns[natural]) || otherNoun
    return `${count} ${count > 1 ? plural : singular}`
}

// "a", "a and b", "a, b and c"
const joinWithAnd = (items: string[]) =>
    items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

export const buildChangesetComment = (edits: CommentedEdit[]): string => {
    const parts: string[] = []
    for (const action of ['add', 'update', 'delete'] as Action[]) {
        // count per natural type, known types first in a stable order
        const counts: Record<string, number> = {}
        for (const edit of edits) {
            if (edit.action !== action) continue
            const type = edit.natural !== undefined && edit.natural in naturalNouns ? edit.natural : ''
            counts[type] = (counts[type] ?? 0) + 1
        }
        const types = [...Object.keys(naturalNouns), ''].filter((type) => counts[type] !== undefined)
        if (types.length === 0) continue
        const nouns = types.map((type) => countNoun(counts[type], type === '' ? undefined : type))
        parts.push(`${actionVerbs[action]} ${joinWithAnd(nouns)}`)
    }
    const comment = parts.join('; ')
    return comment.charAt(0).toUpperCase() + comment.slice(1)
}
