
import sqrmToLines from './sqrm-to-lines.js'
import linesToSxast from './lines-to-sxast.js'

export default function sxastParser(src,options) {

    if (options.log_src) {
        console.log('= src ================')
        console.log(src)
    }
    
    const lines = sqrmToLines(src)
    
    if (options.log_lines) {
        console.log('= lines =============')
        console.log(lines);
    }
    
    const sxasts = linesToSxast(lines)
    
    if (options.log_sxast) {
        console.log('= sxast =============')
        console.log(sxasts);
    }
    
    return sxasts
}