
// TODO: yaml docs from https://www.cloudbees.com/blog/yaml-tutorial-everything-you-need-get-started

import {expect} from 'chai';

import * as fs from 'fs'//const fs = require("fs");

import JSON5 from 'json5'
import {h} from 'hastscript'
import {t} from '../src/hastscript-tools.js'
import sqrm from '../src/main.js'

class TestSqrmCollection {

   constructor(includeCallback) {
        this.includeCallback = includeCallback;
   }

   include(opts) {
    try {
        return this.includeCallback(opts)
    } catch (e) {
        return h('span',{class: 'error'},[t(`error occured including: ${opts.name}`)])
    }
   }

   call(name,request,response) {
   }

   find(select,filter,skip,count) {
  }

}

function test(name,source,expectedHtml,expectedJson={},includeCallback) {
    
    it(name+"", function() {

        const result = sqrm(source,{
            collection: new TestSqrmCollection(includeCallback),
            
            log_src: process.env.npm_config_src,
            log_lines: process.env.npm_config_lines,
            log_sxast: process.env.npm_config_sxast,
            log_code: process.env.npm_config_code,

            log_sast: process.env.npm_config_sast,
            log_hast: process.env.npm_config_hast,
            log_html: process.env.npm_config_html,
            log_jast: process.env.npm_config_jast,
            log_json: process.env.npm_config_json,
        })

        let html,json

        if (Array.isArray(result)) {

            html = ''
            json = []

            result.forEach((el) => {
                html += el.html
                json.push(el.json)
            })

        } else {
            html = result.html
            json = result.json
        }

        expect(json).to.eql(expectedJson)
        expect(html).to.eql(expectedHtml);
    })
}

describe("Non-file based tests", function() {

    describe("Escaping", function() {

        test("escape characters",
            'fred & barry ( 1 < 3 || 4 > 4 \\ woot)',
            '<p>fred &#x26; barry ( 1 &#x3C; 3 || 4 > 4 \\ woot)</p>',
            {});
    });

    describe("Headings", function() {

        test('heading 1',
            '= head\n',
            '<h1>head</h1>',
            {})

        test('heading 2',
            '== head\n',
            '<h2>head</h2>',
            {});

        test('heading 3',
            '  === head\n',
            '<div><h3>head</h3></div>',
            {})

        test("heading 4",
            '= head\r\ning',
            '<h1>head</h1><p>ing</p>',
            {})

        test("heading 5",
            '= head\r\ning\nand some more\n',
            '<h1>head</h1><p>ing\nand some more</p>',
            {})

        test("heading 6", 
            '= head\r\n\r\ning',
            '<h1>head</h1><p>ing</p>',
            {})

        test("heading 7",
            '= head\r',
            '<h1>head</h1>',
            {})

        test("heading 8",
            '= head\r\n',
            '<h1>head</h1>',
            {})

        test("heading 9",
            '= head\ning',
            '<h1>head</h1><p>ing</p>',
            {})

        test("heading 10", 
            '= head\n',
            '<h1>head</h1>',
            {})

        test("heading 11",
            '\n  == heading ============================ \ntext',
            '<div><h2>heading</h2></div><p>text</p>',
            {})

        test("heading 11a", 
            '\n  == heading ---------------------------- \ntext',
            '<div><h2>heading</h2></div><p>text</p>',
            {})

        test("heading 12",
            '\n  == heading ============================ \n\ntext',
            '<div><h2>heading</h2></div><p>text</p>',
            {})

        test("heading 13", 
            '\n  = heading\n\ntext',
            '<div><h1>heading</h1></div><p>text</p>',
            {})

        test("heading 14", 
            '\n=\n\n',
            '<hr>',
            {})

        test("heading 15",
            '= heading \ncontinued =======',
            '<h1>heading</h1><p>continued =======</p>',
            {})

        test("heading 16",
            '= heading \n  indented',
            '<h1>heading</h1><div><p>indented</p></div>',
            {})
    });

    describe("paragraphs", function() {

        test("paragraphs 1",
            'a',
            '<p>a</p>',
            {})

        test("paragraphs 2",
            'a\nb\n',
            '<p>a\nb</p>',
            {})

        test("paragraphs 3",
            'a\nb\n',
            '<p>a\nb</p>',
            {})

        test("paragraphs 4",
            'a\nb\n\nc\n',
            '<p>a\nb</p><p>c</p>',
            {})

    });

    describe("formatting", function() {

        test('formatting 1','a !! b !! c','<p>a <b> b </b> c</p>')
        test('formatting 1a','a!!b!!c','<p>a<b>b</b>c</p>')
        test('formatting 2','a ** b ** c','<p>a <b> b </b> c</p>')
        test('formatting 3','a ~~ b ~~ c','<p>a <i> b </i> c</p>')
        test('formatting 4','a // b // c','<p>a <i> b </i> c</p>')
        test('formatting 5','a -- b -- c','<p>a <del> b </del> c</p>')
        test('formatting 6','a __ b __ c','<p>a <u> b </u> c</p>')
        test('formatting 7','a `` b `` c','<p>a <code> b </code> c</p>')
        test('formatting 8','a ^^ b ^^ c','<p>a <sup> b </sup> c</p>')
        
        test('formatting 9','a !! b c','<p>a <b> b c</b></p>')
        test('formatting 10','a ** b c','<p>a <b> b c</b></p>')
        test('formatting 11','a ~~ b c','<p>a <i> b c</i></p>')
        test('formatting 12','a // b c','<p>a <i> b c</i></p>')
        test('formatting 13','a -- b c','<p>a <del> b c</del></p>')
        test('formatting 14','a __ b c','<p>a <u> b c</u></p>')
        test('formatting 15','a `` b c','<p>a <code> b c</code></p>')
        test('formatting 16','a ^^ b c','<p>a <sup> b c</sup></p>')

        test('formatting 17','a \\!! b c','<p>a !! b c</p>')
        test('formatting 18','a \\** b c','<p>a ** b c</p>')
        test('formatting 19','a \\~~ b c','<p>a ~~ b c</p>')
        test('formatting 20','a \\// b c','<p>a // b c</p>')
        test('formatting 21','a \\-- b c','<p>a -- b c</p>')
        test('formatting 22','a \\__ b c','<p>a __ b c</p>')
        test('formatting 23','a \\`` b c','<p>a `` b c</p>')
        test('formatting 24','a \\^^ b c','<p>a 😊 b c</p>')
        
        test('formatting 25','a ^^ b __ c -- !! d !! e','<p>a <sup> b <u> c <del> <b> d </b> e</del></u></sup></p>')
        
    });

    describe("links", function() {

        // links
        
        test("links 27",'s1df \\[Link back to H2] fred','<p>s1df [Link back to H2] fred</p>')
        test("links 28",'s2df [Link back to H2\\] fred','<p>s2df [Link back to H2] fred</p>')
        test("links 29",'s3df [ Link back to H2 ] fred','<p>s3df <a href="/link_back_to_h2">Link back to H2</a> fred</p>')
        test("links 30",'s4df [ Link | with text ] fred','<p>s4df <a href="/link">with text</a> fred</p>')
        test("links 31",'s5df [Link ba\\|ck to H2] fred','<p>s5df <a href="/link_ba%7Cck_to_h2">Link ba|ck to H2</a> fred</p>')
        test("links 32",'s6df [Link ba\\]ck to H2] fred','<p>s6df <a href="/link_ba%5Dck_to_h2">Link ba]ck to H2</a> fred</p>')
        test("links 33",'s7df [Link ba\\ck to H2] fred','<p>s7df <a href="/link_ba%5Cck_to_h2">Link ba\\ck to H2</a> fred</p>')
        
    });

    describe("divs", function() {
    
        test('divs 1','fred\n\n< blockquote\n\n  <div id="fred" class="woot" \n woot\n\n','<p>fred</p><blockquote><div id="fred" class="woot"></div></blockquote><p>woot</p>')
        test('divs 2','fred\n\n<blockquote\n\n  with more\n\n  <div\n\n    another indented','<p>fred</p><blockquote><p>with more</p><div><p>another indented</p></div></blockquote>')
        
    });

    describe("inline mentions", function() {

        // inline mentions
        
        test('mentions 1','twitter style @user mentions',
            '<p>twitter style <a href="/users/user">@user</a> mentions</p>')
        
    });

    describe("hash tags", function() {
    
        // tags
        
        test('tags 1','this is a tag #a in a line',
            '<p>this is a tag <a href="/tags/a">#a</a> in a line</p>',
            {  "a": true})
        test('tags 2','this is an invalid tag #- in a line',
            '<p>this is an invalid tag #- in a line</p>')
        test('tags 3','this is an invalid tag # in a line',
            '<p>this is an invalid tag # in a line</p>')
        test('tags 4','this is an escaped tag \\#a in a line',
            '<p>this is an escaped tag #a in a line</p>')
        test('tags 5','this is a tag ending a #line',
            '<p>this is a tag ending a <a href="/tags/line">#line</a></p>',
            {  "line": true })
        test('tags 6','#tag_me is at the start of the line',
            '<p><a href="/tags/tag_me">#tag_me</a> is at the start of the line</p>',
            {  "tag_me": true})
        test('tags 7','\\#tag_me: this is a line, # is not valid in a prop',
            '<p>#tag_me: this is a line, # is not valid in a prop</p>')
        test('tags 8','#tag_me: is at the start of the line',
            '<p><a href="/tags/tag_me">#tag_me</a>: is at the start of the line</p>',
            { "tag_me": true})
        test('tags 9','#tag_me\\: is at the start of the line',
            '<p><a href="/tags/tag_me">#tag_me</a>\\: is at the start of the line</p>',
            {  "tag_me": true})
        
    });

    describe("hash tags with parameters", function() {
    
        // tags with parameters
        
        test('tag params 1','this is a tag #a(1,2,[")"]) in a line',
            '<p>this is a tag <a href="/tags/a">#a(1,2,[")"])</a> in a line</p>',
            {  "a": [    1,    2,   [     ")"    ]  ]})
        test('tag params 2','this is a tag ending a #line("with () text")',
            '<p>this is a tag ending a <a href="/tags/line">#line("with () text")</a></p>',
            { "line": "with () text"})
        test('tag params 3','#tag_me(1,2) is at the start of the line',
            '<p><a href="/tags/tag_me">#tag_me(1,2)</a> is at the start of the line</p>',
            {  "tag_me": [    1,    2  ]})
        test('tag params 4','multiple tags #here and #there, also #here',
            '<p>multiple tags <a href="/tags/here">#here</a> and <a href="/tags/there">#there</a>, also <a href="/tags/here">#here</a></p>',
            {"here": true, "there": true})
        test('tag params 5','#tag',
            '<p><a href="/tags/tag">#tag</a></p>',
            {"tag": true})

        test('tag params 6',
            '#image("my_image.png",200,200,"alt text")',
            '<p><a href="/tags/image">#image("my_image.png",200,200,"alt text")</a></p>',
            { image: ["my_image.png", 200,200, "alt text"]})
        
    });

    describe("hash bang ??", function() {

        test('simple hash bang for an image with error',
            'this is an image: #!image(my_image.png,200,200,alt text) inline',
            '<p>this is an image: <img src="my_image.png,200,200,alt text" width="undefined" height="undefined" alt="undefined">(my_image.png,200,200,alt text) inline</p>',
            {},
            function includeCallback(opts) {
                return h('img',{
                    src: `${opts.args[0]}`,
                    width: `${opts.args[1]}`,
                    height: `${opts.args[2]}`,
                    alt: `${opts.args[3]}`
                })
            })

        test('simple hash bang for an image',
            'this is an image: #!image("my_image.png",200,200,"alt text") inline',
            '<p>this is an image: <img src="my_image.png" width="200" height="200" alt="alt text"> inline</p>',
            {},
            function includeCallback(opts) {
                return h('img',{
                    src: `${opts.args[0]}`,
                    width: `${opts.args[1]}`,
                    height: `${opts.args[2]}`,
                    alt: `${opts.args[3]}`
                })
            })
    })

    describe("template strings", function() {
    
        // inline includes
        
        test('template 1','menu: WOOT \n\nalso supports ${json.menu} tag includes',
            '<p>also supports WOOT tag includes</p>',
            {  "menu": "WOOT" })
        test('template 2','menu:\n  - saturday\n  - sunday\n\nand with params ${json.menu[0]} like that',
            '<p>and with params saturday like that</p>',
            {"menu": ["saturday","sunday"]})

        test('template 3',"obj3: {a:1,b:2}",'',{obj3:{a:1,b:2}})
        test('template 4',"#obj2( {a:1,b:2} )",'<p><a href="/tags/obj2">#obj2( {a:1,b:2} )</a></p>',{obj2:{a:1,b:2}})
        test('template 5',"- Fred: [1,2,3]",'',[ { Fred: [1,2,3] }] )
    
    });

    // misc
        
    describe("misc", function() {

        // detect this and make it a list rather than yaml?
        test('is this yaml or a list?','text followed by a list:\n- one\n- two\n',
            '<p>text followed by a list:</p>',["one","two"])
        
        // is this yaml (json) or a list (html)? ... its a json array
        test('simple list','- one\n- two',
            '',["one","two"])
        
    })

})

describe("file based tests", function() {

    function includeCallback(opts) {
        return h('img',{
            src: `${opts.args[0]}`,
            width: `${opts.args[1]}`,
            height: `${opts.args[2]}`,
            alt: `${opts.args[3]}`
        })
    }

    const pattern = /\.sqrm$/
    fs.readdirSync('./test/docs/').forEach(file => {
        if (pattern.test(file)) {

            const name = file.replace(/\.[^/.]+$/, "")

            const src = fs.readFileSync(`./test/docs/${name}.sqrm`, 'utf-8').toString()
            const expectedHtml = (
                fs.existsSync(`./test/docs/${name}.html`)
                ? fs.readFileSync(`./test/docs/${name}.html`, 'utf-8').toString().replaceAll(/\r/g,'')
                : '' )
            const expectedJson = (
                fs.existsSync(`./test/docs/${name}.json`)
                ? JSON5.parse(fs.readFileSync(`./test/docs/${name}.json`, 'utf-8').toString())
                : {} )

            test(`file: ${file}`,src,expectedHtml,expectedJson,includeCallback)

        }
    });

});
