

import {h} from 'hastscript'
import {t} from './hastscript-tools.js'
import toJson from './../src/jast-to-json.js'

function iterateLikeStack(tree,cb) {
    let el = tree
    while (el != null) {
        if (cb.call(null,el) === false) return
        el = (el.children ? el.children[el.children.length-1] : null)
        if (el!=null && el.type == 'value') {
            el = null
        }
    }
}

export default class SqrmResponse {
    constructor(docs) {
        this.docs = docs
        this.root = [];
        this.json = null

        this.yamlNotAllowedIndent = -1

        this.libs = {
            h: h,
            t: t,
            include: this.include.bind(this),
//            j: this.j.bind(this),
            maybeYaml: this.maybeYaml.bind(this),
            addTask: this.addTask.bind(this),
            inlineTag: this.inlineTag.bind(this),
            appendToHtml: this.appendToHtml.bind(this),
//            set: this.set,
//            append: this.append//.bind(this),
        };//, tree: new Tree(), util: util };

        this.jsonTree = { minChildIndent: 0, type: 'unknown', name: 'root' }
    }

    updateJson() {
        this.json = toJson(this.jsonTree)
    }


    include(args) {
        return this.docs.include(args)
    }

    appendToHtml(obj) {

        if (this.yamlNotAllowedIndent != -1 && obj.type != 'blank') {
            if (obj.indent < this.yamlNotAllowedIndent) {
                this.yamlNotAllowedIndent = -1
            }
        }

        if (this.yamlNotAllowedIndent == -1 && obj.type == 'div') {
            switch (obj.tag) {
                case 'pre':
                case 'script':
                case 'style':
                case '!--':
                    this.yamlNotAllowedIndent = obj.indent + 1
            }
        }

        this.root.push(obj)
    }

    maybeYaml(obj) {

        if (this.yamlNotAllowedIndent != -1 && obj.indent < this.yamlNotAllowedIndent) {
            this.yamlNotAllowedIndent = -1
        }

        const yaml = ( obj.type == 'yaml' ? obj : obj.yaml )
        const line = obj

        if (this.yamlNotAllowedIndent != -1) {
            if (obj.type == 'yaml') obj.type = 'text'
            this.root.push( obj )// { type: 'text', line: obj.line, text: obj.text, indent: obj.indent, children: obj.children }
        } else if (this.jsonTag(yaml)) {
            this.root.push( { type: 'blank', line: obj.line } )// h('a',{href:`/tags/${obj.name}`},obj.children)
        } else {
            if (obj.type == 'yaml') obj.type = 'text'
            this.root.push( obj )// { type: 'text', line: obj.line, text: obj.text, indent: obj.indent, children: obj.children }
        }
    }

    addTask({line,done,text}) {
        let tasksNode = null

        if (this.jsonTree.type == 'unknown') {
            this.jsonTree.type = 'object'
            this.jsonTree.childrenIndent = 0
            delete this.jsonTree.minChildIndent
            tasksNode = { type: 'array', name: 'tasks', childrenIndent: 1, children: [] }
            this.jsonTree.children = [tasksNode]
        } else if (this.jsonTree.type == 'object') {
            for (let i=0 ; i<this.jsonTree.children.length ; i++) {
                const child = this.jsonTree.children[i]
                if (child.name == 'tasks') {
                    tasksNode = child
                    break
                }
            }

            if (tasksNode == null) {
                tasksNode = { type: 'array', name: 'tasks', childrenIndent: 1, children: [] }
                this.jsonTree.children.push(tasksNode)
            }
        } else {
            // silently not supported if the root is an array
            return
        }

        const taskNode = { type: 'object', childrenIndent: 2, children: [] }
        taskNode.children.push({ type: 'value', name: 'line', value: line })
        taskNode.children.push({ type: 'value', name: 'text', value: text })
        taskNode.children.push({ type: 'value', name: 'done', value: done })
        tasksNode.children.push(taskNode)

        this.updateJson()
    }

    inlineTag(obj) {
        this.jsonTag({
            indent: 0,
            isArrayElement: false,
            name: obj.name,
            colon: true,
            args: (obj.args === undefined ? true : obj.args )
        })

        return h('a',{ href: `/tags/${obj.name}` }, obj.children )
    }

    // j(name,value) {
    //     console.log('j',name,value)

    //     if (typeof name == 'object') {
    //         if (this.jsonTag(name)) {
    //             // valid yaml, added to json
    //             return h('a',{href:`/tags/${name.name}`},name.children)
    //         } else {
    //             return name.children
    //         }
    //     } else {
    //         if (this.jsonTag({
    //                 indent: 0,
    //                 isArrayElement: false,
    //                 name: name,
    //                 colon: true,
    //                 value: value})) {
    //             // valid yaml, added to json
    //             return h('a',{href:`/tags/${name.name}`},name.children)
    //         } else {
    //             return name.children
    //         }
    //     }
    // }

    jsonTag({indent,isArrayElement,name,colon,args}) {

        if (args != undefined && args.length == 1) {
            args = args[0]
        }

        let parent = null
        if (isArrayElement) {
            // if this is an array element: look for unknown or array

            iterateLikeStack(this.jsonTree, (el) => {
                if (el.type=='unknown' && el.minChildIndent<=indent) {
                    parent = el
                    return false
                } else if (el.type=='array' && el.childrenIndent==indent) {
                    parent = el
                    return false
                }
            })

        } else {
            // if this is not an array element: look fo unknown or object

            iterateLikeStack(this.jsonTree, (el) => {
                if (el.type=='unknown' && el.minChildIndent<=indent) {
                    parent = el
                    return false
                } else if (el.type=='object' && el.childrenIndent==indent) {
                    parent = el
                    return false
                }                
            })
        }

        if (parent == null) {
            return false
        }

        if (parent.type == 'unknown' && !isArrayElement) {
            if (parent.minChildIndent > indent) throw new Error()

            parent.type = 'object'
            parent.childrenIndent = indent
            delete parent.minChildIndent

            if (colon && args === undefined) {
                let n = { minChildIndent: indent, type: 'unknown', name: name }
                parent.children = [ n ]
            } else {
                parent.children = [ { type: 'value', name: name, value: args } ]
            }

            this.updateJson()
            return true
        }

        if (parent.type == 'unknown' && isArrayElement) {
            if (parent.minChildIndent > indent) throw new Error()

            parent.type = 'array'
            parent.childrenIndent = indent
            delete parent.minChildIndent

            if (colon && args === undefined) {
                const unknown = { minChildIndent: indent+1, type:'unknown',name:name }
                const arrayElement = { childrenIndent: indent+1, type: 'object', children: [unknown]}
                parent.children = [arrayElement]
            } else if (colon) {
                const v = { childrenIndent: indent+1, type:'value', name:name, value:args}
                const arrayElement = { childrenIndent: indent+1, type: 'object', children: [v]}
                parent.children = [arrayElement]
            } else if (!colon) {
                parent.children = [ { type: 'value', value: args }]
            }

            this.updateJson()
            return true
        }

        if (parent.type == 'object' && !isArrayElement) {
 
            if (colon && args === undefined) {
                let n = { minChildIndent: indent, type: 'unknown', name: name }
                parent.children.push(n)
            } else {
                parent.children.push({ type: 'value', name: name, value: args })
            }

            this.updateJson()
            return true
        }

        if (parent.type == 'array' && isArrayElement) {

            if (colon && args === undefined) {
                const unknown = { minChildIndent: indent+1, type:'unknown',name:name }
                const arrayElement = { childrenIndent: indent+1, type: 'object', children: [unknown]}
                parent.children.push(arrayElement)
            } else if (colon) {
                const v = { childrenIndent: indent+1, type:'value',name:name,value:args}
                const arrayElement = { childrenIndent: indent+1, type: 'object', children: [v]}
                parent.children.push(arrayElement)
            } else if (!colon) {
                parent.children.push({ type: 'value', value: args })
            }

            this.updateJson()
            return true
        }

        return false
    }

    // append(ln) {
    //     this.lines.push(ln)
    // }
} 
