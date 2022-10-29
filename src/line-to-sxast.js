
import {h} from 'hastscript'
import {t,i} from './hastscript-tools.js'
import util from 'node:util'
import linkifyStr from 'linkify-string';
import strToJson from './str-to-json.js'

export default function lineToSxast(str) {

    let root = h()
    let linkifyOptions = { defaultProtocol: 'https' };

    if (typeof str == 'string') {
        process(root,str,0,'')
    } else {
        root.children.push(str);
    }

    function genCode(children) {
        let codeStr = '['
        for (let index=0 ; index<children.length ; index++) {
            let child = children[index]
            if (child.type == 'text') {
                codeStr += `t(\`${child.value}\`)`
            } else if (child.type == 'element') {
                codeStr += `h("${child.tagName}",${util.inspect(child.properties,false,null,false)},`
                codeStr += genCode(child.children)
                codeStr += ')'
            } else if (child.type == 'include') {
                codeStr += `i("${child.value}",${util.inspect(child.args,false,null,false)})`
            } else if (child.type == 'tag') {
                codeStr += `j("${child.name}",${util.inspect(child.value,false,null,false)})`
            } else {
                throw new Error("child.type: " + child.type);
            }
            if (index < children.length - 1) codeStr += ','
        }
        codeStr += ']'
        return codeStr;
    }

    function code() {
        return codeStr;
    }

    function escapeChar(c) {
        if (c=='`') {
            return '\\`' // '&#96;'
        // } else if (c==':') {
        //     return '&#58;'
        } else if (c=='\\') {
            return '\\\\'
        } else {
            return c;
        }
    }

    function tagFor(c) {
        switch (c) {
            case '!':
            case '*':
                return "b";
            case '~':
            case '/':
                return "i";
            case '_':
                return "u";
            case '-':
                return "del";
            case '^':
                return "sup";
            case '`':
                return "code";
            case '$':
                return "kbd";
            default:
                return c + "";
        }
    }


    function escapeString(s) {
        let punc = /^[-!\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]$/
        let r = ''
        for (let i=0 ; i<s.length ; i++) {
            let a = s[i]
            r += escapeChar(a)
        }
        return r;
    }

    function path(s) {
        return '/' + encodeURIComponent(s.replace(/ +/g,"_").toLowerCase());
    }

    function url(s) {
        s = s.replace(/\\\\/g,'\\')
        const l = linkifyStr(s, {
            defaultProtocol : 'https'
        });
        const m = l.match(/"([^"]+)"/)
        if (m==null) {
            return path(s);
        } else {
            return m[1]
        }
    }


    function link(s) {
        var parts = s.split("|", 2);
        if (parts.length == 2 && parts[0].charAt(parts[0].length-1) == '\\') {
            parts[0] = parts[0].substring(0,parts[0].length - 1) + '|' + parts[1]
            parts.pop();
        }
        if (parts.length == 1) {
            if (parts[0].trim() == '') {
                return t(`[${s}]`)
            }

            let u = escapeString(parts[0].trim().replace(/\\\]/g,']'));

            if (u[0] == '^') {
                u = u.substring(1).trim();
                return h('sup',{},[ h('a',{'footnote-u':u,'href': `#footnote-${u}`},[t(`TBD`)])])
            } else {
                return h('a',{'href':url(u)},[t(u)])
            }
        } else {
            const addr = escapeString(parts[0].trim().replace(/\|/g,'|'));
            const txt = escapeString(parts[1].trim().replace(/\]/g,']'));
            return h('a',{'href':url(addr)},[t(txt)])
        }
    }

    function process(parent,s,index,inChar) {
        var a, b;
        let str = '';

        while (index < s.length) {
            a = s.charAt(index++);
            b = s.charAt(index);

            if (a == '\\') {
                if (b == '$') {
                    str += '\\$';
                    index++;
                    continue;
                }
                let punc = /^[-!\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]$/
                if (b.match(punc)) {
                    str += escapeChar(b);
                    index++;
                    continue;    
                }
            }

            if (a == '[') {
                let prev = a;
                let curr
                for (let k = index; k < s.length; k++) {
                    curr = s.charAt(k)
                    if (curr == ']' && prev !='\\')	{
                        parent.children.push(t(str))
                        str = ''
                        parent.children.push(link(s.substring(index,k)))
                        index = k + 1;
                        if (index >= s.length) {
                            parent.children.push(t(str))
                            str = ''
                            return index;// {i: index, str: strs};
                        }
                        a = s.charAt(index++);
                        break;
                    }
                    prev = curr
                }
            }
            if (a == '@') {
                const ch0 = /^[a-zA-Z]$/
                const chx = /^[a-zA-Z\d_]$/
                let user = ''
                let k = index
                for (; k < s.length; k++) {
                    let ch = s.charAt(k)
                    if ((k==index && ch.match(ch0))
                            || (ch.match(chx))) {
                        user += ch;
                    } else {
                        break;
                    }
                }
                if (user !== '') {
                    index = k;
                    a = s.charAt(index++);
                    parent.children.push(t(str))
                    str = ''
                    parent.children.push(h('a',{'href':`/users/${user}`},[t(`@${user}`)]))
                }
            }
            if (a == '$' && b == '{') {
                str += '$'
                for (let k = index; k < s.length; k++) {
                    let ch = s.charAt(k)
                    str += ch;
                    if (ch=='}') {
                        index = k + 1
                        a = s.charAt(index++);
                        break;
                    }
                }
            }
            if (a == '#') {
                const tagAt = index-1
                const ch0 = /^[a-zA-Z]$/
                const chx = /^[a-zA-Z\d_]$/
                let tag = ''
                let bang = false;
                if (s.charAt(index)=='!') {
                    bang = true;
                    index++;
                }
                let jj = index
                for (; jj < s.length; jj++) {
                    let ch = s.charAt(jj)
                    if ((jj==index && ch.match(ch0))
                            || (ch.match(chx))) {
                        tag += ch;
                    } else {
                        break;
                    }
                }
                if (tag !== '') {
                    index = jj;
                    a = s.charAt(index++);
                    let tagStr = null
                    let tagValueStr = null
                    if (a=='(') {
                        for (var k = index; k < s.length; k++) {
                            let ch = s.charAt(k)
                            if (ch==')') {
                                tagValueStr = s.substring(index,k)
                                if (strToJson(tagValueStr)) {
                                    tagStr = s.substring(tagAt,k+1)
                                    index = k + 1
                                    a = s.charAt(index++);
                                    break;
                                } else {
                                    tagValueStr = null
                                    console.log('FAILED to parse:' + s.substring(index,k))
                                }
                            }
                        }
                    } else {
                        tagStr = s.substring(tagAt,index-1)
                    }

                    if (bang) {
                        parent.children.push(i(tag,tagValueStr))
                    } else {
                        if (str != '') {
                            parent.children.push(t(str))
                            str = ''
                        }

                        parent.children.push({
                            type:'tag',
                            indent: 0,
                            name: tag,
                            colon: true,
                            value: tagValueStr,
                            children: [t(tagStr)] 
                        })

                    }

                    if (index >= s.length) {
                        break;
                    }
                }
            }
            if (index + 1 > s.length) {
                str += escapeChar(a);
                parent.children.push(t(str))
                return index;//{index: index, str: strs};
            }
            if (a == b
                    && (a == '!' || a == '*' || a == '~' || a == '/' || a == '_' || a == '-'
                            || a == '^' || a == '`' || a == '$')) {
                index++;
                while (s.charAt(index)==a) {
                    b = a;
                    index++; // permissive with extra formatting tag chars
                }
                if (a == inChar) {
                    parent.children.push(t(str))
                    return index; //{index: index, str: strs};
                } else {
                    parent.children.push(t(str))
                    str = '';
                    const el = h(tagFor(a),{})
                    parent.children.push(el)
                    index = process(el,s,index,a)
                }
            } else {
                str += escapeChar(a);
            }
        }

        if (str != '' ) parent.children.push(t(str));//strs.push(str)
        return index;//{index: index,str: strs};
    }

    return root.children


}