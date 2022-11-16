
import mongo from 'mongols'


import SqrmDocument from './SqrmDocument.js'
import SqrmRequest from './SqrmRequest.js'
import SqrmResponse from './SqrmResponse.js'
import sxastParser from './sxast-parser.js';
import responseToResult from './response-to-result.js';

const defaults = {
    collection: 'default',
    name: 'doc',

    log_src: false,
    log_lines: false,
    log_sxast: false,
    log_code: false,

    log_sast: false,
    log_hast: false,
    log_html: false,
    log_jast: false,
    log_json: false
};

export default class SqrmDB {

    constructor(settings = {}) {
        this.settings = Object.assign({}, defaults, settings);
        this.settings.db = this
        this.collections = new Map()
        this.db = new mongo.DB()
        this.createCollection('default')
        this.docsToIndex = []
    }
  
    createCollection(name) {
        this.db.createCollection(name)
        let info = { name: name, docs: new Map(), docsBy_id: new Map() }
        this.collections.set(name,info)
        return info
    }

    createDocument(collection,docName,src) {
        const col = this.collections.get(collection)
        const sxasts = sxastParser(src,this.settings)
        
        if (sxasts.length==1) {
            try {
                let doc = new SqrmDocument(collection,docName,sxasts[0],this)
                col.docs.set(docName,doc)
                this.docsToIndex.push(doc)
            } catch (e) {
                console.log('failed to create doc',e)
            }
        } else {
            for (let i=0 ; i<sxasts.length ; i++) {
                let sxast = sxasts[i]
    
                try {
                    let doc = new SqrmDocument(collection,`${docName}-${i+1}`,sxast,this)
                    col.docs.set(docName,doc)
                    this.docsToIndex.push(doc)
                } catch (e) {
                    console.log('failed to create multi doc',e)
                }
            }
        }

    }

    updateIndex() {
        this.docsToIndex.forEach((doc) => {
            let request = new SqrmRequest();
            let response = new SqrmResponse(this);
            try {
                doc.execute(request,response);
                const res = responseToResult(response,this.settings)
                this.db[doc.collection].insertOne(res.json)
                this.collections.get(doc.collection).docsBy_id.set(res.json._id,doc)
            } catch (e) {
                console.log(`!!! ERROR: failed to index: ${doc.collection}.${doc.name}`)
                console.log('!!! line:  ',e.lineNum)
                console.log('!!! line:  ',e.lineStr)
                console.log('!!! error: ',e.stack.split('\n')[0]);
            }

        })
        this.docsToIndex = []
    }

    call(collection,docName,args) {
        let request = new SqrmRequest(args);
        let response = new SqrmResponse(this);
        let doc = this.find(collection,docName)
        if (doc == null) {
            console.log(`-- failed to call ${docName}(${args}) : not found --`)
            return
        }
        try {
            doc.execute(request,response);
        } catch (e) {
            console.log(`-- failed to call ${docName}(${args}) : script error --`)
            console.log(e);
            console.log('---------------------------------------')
        }

        return responseToResult(response,this.settings)

    }

    find(collection,select,sort,skip,limit) {

        if (typeof collection != "string") {
            throw new Error('collection parameter should be string name of collection')
        }

        const col = this.collections.get(collection)
        if (col == null) {
            throw new Error(`collection "${collection}" doesn't exist`)
        }

        if (typeof select == "string") {

            return col.docs.get(select)

        } else if (typeof select == 'object' && select == Object(select)) {

            let c = this.db[collection].find(select)

            if (sort !== undefined) {
                c = c.sort(sort)

                if (skip !== undefined) {
                    c = c.skip(skip)

                    if (limit !== undefined) {
                        c = c.limit(limit)
                    }
                }
            }

            let res = [];

            c.forEach(doc => {
                res.push(col.docsBy_id.get(doc._id))
            })

            return res
        } else {

            return []
        }
    } 
}