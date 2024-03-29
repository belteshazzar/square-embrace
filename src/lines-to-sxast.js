

import lineToSxast from './line-to-sxast.js'
import strToJs from './str-to-js.js'
import link from './str-to-link.js'

const RE_DocumentSeparator = /^---$/

const RE_BlankLine = /^\s*$/
const RE_Tag = /^\s*(([a-zA-Z_$][-a-zA-Z\d_$]*)\s*:(\s+(.*?))?)\s*$/
const RE_ListItemTag = /^\s*-\s+([a-zA-Z_$][-a-zA-Z\d_$]*)(\s*:(\s+(.*?))?)?\s*$/
const RE_Script = /^(\s*)<%(.*?)\s*$/
const RE_Footnote = /^\s*\[ *\^ *(\S+) *\] *: *(.+?) *$/
const RE_LinkDefinition = /^\s*\[ *([^\]]+) *\] *: *(.+?) *$/
const RE_CodeBlock = /^\s*``` *(([a-zA-Z]+)?)\s*$/
const RE_Div = /^\s*(<\s*((\!doctype)|([a-z]+([a-z0-9]+)?))((?:\s+[a-z]+(="[^"]*")?)*)\s*>?\s*)$/i
const RE_Heading = /^\s*((=+)\s*(\S.*?)\s*[-=]*)\s*$/
const RE_HR = /^\s*[-=_\*\s]+$/
const RE_ListItem = /^\s*(?:(?:([-*+])|(\d+[\.)]))\s+(\S.*?))\s*$/
const RE_ListItemTask = /^\s*\[ *([xX]?) *\]\s+(.*?)\s*$/
const RE_Table = /^\s*(\|(.+?)\|?)\s*$/
const RE_TableHeader = /^\s*[-| ]+$/

const RE_ScriptEnd = /%>\s*$/

export default function linesToSxast(lines) {
    let docs = [[]]
    let doc = docs[0]
    let i = 0

    function next() {
        if (i==lines.length) return null
        return lines[i++]
    }

    function peek() {
        if (i==lines.length) return null
        return lines[i]
    }

    function script() {
        while (peek()!=null) {
            let ln = next()
            let m = ln.text.match(RE_ScriptEnd)
            if (m) {
                doc.push({ type: 'script', line: ln.line, code: ln.text.replace(RE_ScriptEnd,''), text: ln.text})
                break
            } else {
                doc.push({ type: 'script', line: ln.line, code: ln.text,text: ln.text })
            }
        }
    }

    while (peek()!=null) {
        let ln = next()

        const s = lineToSqrm(ln)

        if (s.type == 'document-separator') {
            doc = []
            docs.push(doc)
        } else {

            doc.push(s)

            if (s.type == 'script') {
                let m = ln.text.match(RE_ScriptEnd)
                if (m) {
                    s.code = s.code.replace(RE_ScriptEnd,'')
                } else {
                    script()
                }
            }
        }
    }

    // TODO: put this logic inline rather than post
    // at this point text lines and unordered/ordered-list-item lines 
    // do not have have .children set

    const docsX = []
    for (const doc of docs) {
        const docX = []
        docsX.push(docX)
        for (let i=0 ; i<doc.length ; i++) {
            const line = doc[i]
            if (line.type == 'text') {
                let text = line.text
                let trimmed = line.text.trim()
                for (let j=i+1 ; j<doc.length ; j++) {
                    const lineX = doc[j]
                    if (lineX.type == 'text' && lineX.indent == line.indent) {
                        text += '\n' + lineX.text
                        trimmed += '\n' + lineX.text.trim()
                        i++
                    } else {
                        break
                    }
                }
                line.type = 'paragraph'
                line.children = textToHast(trimmed)
                line.text = text
            } else if (line.type == 'unordered-list-item' || line.type == 'ordered-list-item') {
                let text = line.text
                let trimmed = line.item.trim()

                for (let j=i+1 ; j<doc.length ; j++) {
                    const lineX = doc[j]
                    if (lineX.type == 'text' && lineX.indent == line.indent + 1) {
                        text += '\n' + lineX.text
                        trimmed += '\n' + lineX.text.trim()
                        i++
                    } else {
                        break
                    }
                }

                line.item = trimmed
                line.children = textToHast(trimmed)
                line.text = text
            }

            docX.push(line)
        }
    }

    return docsX
}

function textToCells(text) {

    function splitText(text) {
        let cells = text.split('|')

        for (let c = cells.length-1 ; c>0 ; c--) {
            if (cells[c-1].charAt(cells[c-1].length-1) == '\\') {
                cells[c-1] = cells[c-1].slice(0,-1) + '|' + cells[c];
                cells.splice(c,1);
            }
        }
    
        return cells;
    }

    function pragmasToAttributes(pragmas) {
        let attr = {}
        
        for (let i=0 ; i<pragmas.length ; i++) {
            switch (pragmas[i]) {
                case '!' :
                    attr.header = true;
                    break;
                case 'r':
                    attr.align='right';
                    break;
                case 'l':
                    attr.align='left';
                    break;
                case 'c':
                    attr.align='center';
                    break;
                case 'v':
                    if (i+1<pragmas.length) {
                        let c = pragmas[i+1]
                        if (c >= '3' && c <= '9') {
                            attr.rowspan=c*1
                            i++
                        } else {
                            attr.rowspan=2
                        }
                    } else {
                        attr.rowspan=2
                    }
                    break;
                case '>':
                    if (i+1<pragmas.length) {
                        let c = pragmas[i+1]
                        if (c >= '3' && c <= '9') {
                            attr.colspan=c*1
                            i++
                        } else {
                            attr.colspan=2
                        }
                    } else {
                        attr.colspan=2
                    }

                    break;
            }
        }
        return attr
    }

    function tableCellFormatting(s) {
        for (let i=0; i<s.length ; i++) {
            if (s[i]==' ') {
                if (i==0 || i==s.length-1) return ['',s.trim()];
                return [s.substring(0,i),s.substring(i).trim()]
            }
        }
        return ["",s.trim()];
    }
        
    let cells = splitText(text)
    for (let i=0 ; i<cells.length ; i++) {
        let [f,t] = tableCellFormatting(cells[i])
        cells[i] = { children: textToHast(t), formatting: pragmasToAttributes(f) }
    }
    return cells;
}

function textToHast(text) {
    return lineToSxast(text)
}

function lineToSqrm(ln) {

    if (ln.text.length==0) {
        return {type:'blank', line:ln.line, text: ln.text}
    }

    let m;

    m = ln.text.match(RE_DocumentSeparator);
    if (m) {
        return {type:'document-separator', line: ln.line}
    }

    m = ln.text.match(RE_HR);
    if (m) {
        return {type:'hr',indent:ln.indent,line:ln.line, text: ln.text}
    }

    m = ln.text.match(RE_Heading)
    if (m) {
        return {type:'heading',text: ln.text, level:m[2].length,indent:ln.indent,children:textToHast(m[3]),line:ln.line}
    }

    m = ln.text.match(RE_ListItem)
    if (m) {

        if (m[1]!==undefined) {
            let t = m[3].match(RE_ListItemTask)
            if (t) {
                let task = { line: ln.line, done: t[1]!='', text: t[2] }
                // children = text and is converted to hast in post-process
                return {type:'unordered-list-item',text: ln.text, indent:ln.indent,marker:m[1],item:t[2],line:ln.line, task: task}
            } else {
                // children = text and is converted to hast in post-process
                let uli = {type:'unordered-list-item',text: ln.text, indent:ln.indent,marker:m[1],item:m[3],line:ln.line}

                let yaml = ln.text.match(RE_ListItemTag)
                if (yaml) {
                    uli.yaml = { indent: ln.indent, isArrayElement: true }
                    if (yaml[4]) {
                        uli.yaml.name = yaml[1]
                        uli.yaml.value = strToJs(yaml[4],false)
                        uli.yaml.colon = true
                    } else if (yaml[2]) {
                        uli.yaml.name = yaml[1]
                        uli.yaml.colon = true
                    } else {
                        uli.yaml.value = strToJs(yaml[1],false)
                        uli.yaml.colon = false
                    }
                }

                return uli
            }
        } else if (m[2]!==undefined) {
            let t = m[3].match(RE_ListItemTask)
            if (t) {
                let task = { line: ln.line, done: t[1]!='', text: t[2] }
                // children = text and is converted to hast in post-process
                return {type:'ordered-list-item',text: ln.text, indent:ln.indent,number:m[2],item:t[2],line:ln.line, task : task}
            } else {
                // children = text and is converted to hast in post-process
                return {type:'ordered-list-item',text: ln.text, indent:ln.indent,number:m[2],item:m[3],line:ln.line}
            }
        }
    }

    m = ln.text.match(RE_Script)
    if (m) {
        return {type:'script',indent:ln.indent, code: m[1] + '  ' + m[2], line:ln.line, text: ln.text}
    }

    m = ln.text.match(RE_Div)
    if (m) {
        let properties = {}
        if (m[6]) {
            let props =  [... m[6].matchAll(/([^\s=]+)(=["]([^"]*)["])?/g) ]
            for (let prop of props) {
                if (prop[3]) {
                    properties[prop[1]] = { value: prop[3] }
                } else {
                    properties[prop[1]] = { value: true }
                }
            }
        }
        return {type:'div',indent:ln.indent,tag:(m[2]?m[2]:'div'),properties:properties, text: ln.text, line:ln.line}
    }

    m = ln.text.match(RE_Table)
    if (m) {
        const divider = ln.text.match(RE_TableHeader) !== null
        return { type: 'table-row', indent: ln.indent, divider: divider, text: ln.text, cells: textToCells(m[2]), line: ln.line }
    }

    m = ln.text.match(RE_BlankLine) 
    if (m) {
        return {type:'blank', line:ln.line}
    }

    m = ln.text.match(RE_Tag);
    if (m) {
        let tag = {type:'yaml',indent:ln.indent, name:m[2], colon: true, isArrayElement: false, line:ln.line, children: textToHast(m[1]), text: ln.text}
        if (m[4]) {
            tag.value  = strToJs(m[4],false)
        }
        return tag
    }

    m = ln.text.match(RE_Footnote);
    if (m) {
        return { type: 'footnote', indent: ln.indent, id: m[1], children: textToHast(m[2]), text: ln.text }
    }

    m = ln.text.match(RE_LinkDefinition);
    if (m) {
        return { type: 'link-definition', indent: ln.indent, id: m[1].trim().toLowerCase(), link: link(m[2]) }
    }

    m = ln.text.match(RE_CodeBlock);
    if (m) {
        return {type:'code-block',indent:ln.indent,language: m[1],line:ln.line}
    }

    // children = text and is converted to hast in post-process
    return {type:'text',indent:ln.indent,line:ln.line, children:ln.text.trim(),text: ln.text}

}
