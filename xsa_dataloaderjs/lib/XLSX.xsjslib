var XLSX = {};
(function(XLSX){

function stitchElem(rows,string,hdrtab,rowsignore){
    var output_tab = [];
    if(!rowsignore){
        rowsignore = 0;
    }
    // Loop through the rows
    for(var i=rowsignore; i<rows.length; i++){
        var colnum = rows[i].children.length;
        var obj = {};
        // Loop through the columns
        for(var j=0; j<colnum; j++){
            var type = rows[i].children[j].t;
            if(rows[i].children[j].children){
                var value = rows[i].children[j].children[0].characterData;
                
                if(type === 's'){
                    value = string[value].children[0].characterData;
                }
                
                obj[hdrtab[j].COLUMN_NAME] = value;
            }
        }
        if(Object.keys(obj).length != 0){
            output_tab.push(obj);
        }
    }
    return output_tab;
}
function getElem(content){
    //parse XML from String
    var parser = new $.util.SAXParser();
    var rootElement;
    var characterData = [];
    var elementStack = [];
    
    parser.startElementHandler = function(name, attrs) {
    var data = attrs; // use attrs object with all properties as template
    data.name = name; // add the name to the object
    
    if(!rootElement) { // the first element we see is the root element we want to send as response
    rootElement = data;
    } else {
    var currentElement = elementStack[elementStack.length - 1];
    if(!currentElement.children) { // first time we see a child we have to create the children array
    currentElement.children = [ data ];
    } else {
    currentElement.children.push(data)
    }
    }
    elementStack.push(data);
    };
    
    parser.endElementHandler = function(name) {
      elementStack.pop();
    };
    
    parser.characterDataHandler = function(s) {
      var currentElement = elementStack[elementStack.length - 1];
      if (!currentElement.characterData) { // the first time we see char data we store it as string
         currentElement.characterData = s;
      } else if (!Array.isArray(currentElement.characterData)) { // if we already have a string we convert it to an array and append the new data
         currentElement.characterData = [currentElement.characterData, s];
      } else { // just append new data to the existing array
         currentElement.characterData.push(s);
      }
    };
    
    parser.parse(content);
    
    return rootElement;
}
function get_templateinfo(projid){
    var conn = $.hdb.getConnection();
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_003');
    
    return fndlreg(projid, null);
}
function get_templatehdr(projid){
    var conn = $.hdb.getConnection();
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_011');
    
    return fndlreg(projid, null);
}

function make_xlsx(id, databuffer){
    var myzip = $.util.Zip(databuffer);
    var sheet1 = myzip['xl/worksheets/sheet1.xml'];
    var stringxml = myzip['xl/sharedStrings.xml'];
    
    var sheet1elem = getElem(sheet1);
    var stringelem = getElem(stringxml);
    
    var templateinfo = get_templateinfo(id);
    var templatehdr = get_templatehdr(id);
    
    return stitchElem(sheet1elem.children[4].children, stringelem.children, templatehdr.OUTPUT_TABLE, templateinfo.OUTPUT_TABLE[0].ROWS);
        
}  

XLSX.read = make_xlsx;
    })(XLSX);