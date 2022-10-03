
import NonEmptyLine from "./NonEmptyLine.js";
import BlankLine from "./BlankLine.js";
import {h} from 'hastscript'
import {t,i} from '../hastscript-tools.js'

export default class CodeBlock extends NonEmptyLine {
    constructor(ln,re) {
        super(ln,re[1].length,re[0]);
        this.language = re[4].toLowerCase();
    }

    process(is,os) {
        let code = '';

        while (is.nextLine !== false
                && (is.nextLine instanceof BlankLine
                    ||
                    (is.nextLine instanceof NonEmptyLine
                    && is.nextLine.indent >= this.indent
                    && !(is.nextLine instanceof CodeBlock)))) {

            if (is.nextLine instanceof BlankLine) {
                code += '\n';
            } else {
                for (let i=this.indent ; i<is.nextLine.indent ; i++) {
                    code += ' ';
                }
                code += is.nextLine.text + '\n';
            }
            is.next();
        }

        switch (this.language) {
            case 'info':
            case 'tip':
            case 'note':
            case 'warning':
                // os.el(this.indent,'div', `class="alert-${this.language}"`);
                // os.p(this.indent+2,os.format(code,0,'').str);
                // os._el();

                os.h(this.indent,h('div', {
                    class: `alert-${this.language}`
                },[
                    h('p',{},[
                        os.parseLine(code)
                    ])
                ]))
                break;
            default:
                // os.el(this.indent,'pre');
                // os.el(this.indent+2,'code',`class="language-${this.language}"`)
                // os.raw(this.indent+4,os.escape(code));    
                // os._el();
                // os._el();    

                os.h(this.indent, h('pre',{},[
                    h('code',{
                        class: `language-${this.language}`
                    },[
                        t(os.escape(code))
                    ])
                ]))
        }

        if (is.nextLine !==false && is.nextLine instanceof CodeBlock) {
            is.next();
        }
    }
}

CodeBlock.re = /^(( )*)(```)(([a-zA-Z]+)?)\s*$/
