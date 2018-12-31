function doExcelImport() {

	var data = $.request.entities[0].body;
	var a = $.request.entities[0].body.asString();

	$.response.setBody(a);
	var conn = $.db.getConnection();
	var pstmt = conn.prepareStatement( "insert into \"KLAI\".\"system-local.public.klai.DataLoader.model::attachment\" values(TO_ALPHANUM(?),?)");

	
	pstmt.setInt(1,'000001');
	pstmt.setBlob(2,data);

	var rs = pstmt.executeQuery();
	rs.close();
	pstmt.close();
	conn.commit();
	conn.close();	  
}
function stitchElem(rows,string,hdrtab,rowsignore){
    var output_tab = [];
    
    // Loop through the rows
    for(var i=0; i<rows.length; i++){
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
function upload(){
	var id = $.request.parameters.get("id");  
    $.import("system-local.public.klai.DataLoader", "XLSX");
    var myxlsx = $.system-local.public.klai.DataLoader.XLSX; 
    var data = myxlsx.XLSX.read(id, $.request.entities[0].body.asArrayBuffer());
}
function get_username() {
	var username = $.session.getUsername();
	
	return username;
}
function get_date() {
	var today = new Date();
	var sday = today.getDate().toString();
    var smonth = today.getMonth()+1;
    smonth = smonth.toString();
    
    if(smonth.length < 2){
        smonth = '0' + smonth;
    }
    if(sday.length < 2){
        sday = '0' + sday;
    }
    var sdate = today.getFullYear().toString() + smonth + sday;
    
    return sdate;
}
function get_time() {
	var today = new Date();
	var stime = today.toTimeString().split(' ')[0].split(':').join('');
	
	return stime;
}
function get_version(ou,year,qtr) {
	var conn = $.hdb.getConnection();
	var pad = "000";
	var version = 0;
	// Get max version from the loaded table
	var sql = "SELECT MAX(_BIC_SH002975) AS maxversion FROM \"KLAI\".\"system-local.public.klai.DataLoader.model::SERS_DataLoader\" "+
	          "WHERE _BIC_ER000288 = ? \n"+
	          "AND _BIC_ER000493 = ? \n"+
	          "AND _BIC_ER000494 = ?;";
	var result = conn.executeQuery(sql,ou,year,qtr);
	
	if(result.length>0 && result[0].MAXVERSION!=null){
	    version = parseInt(result[0].MAXVERSION);
	}
	version++;
	version = pad + version;
	return version.slice(-pad.length);
}
function get_qtr() {
    //Determine current submission quarter base on date now
	var today = new Date();
    var mth = today.getMonth()+1; //January is 0!
    var qtr = "4";
    
    if((mth==12) | (mth==1) | (mth==2)){
        qtr = 4;
    }
    else if((mth==3) | (mth==4) | (mth==5)){
        qtr = 1;
    }
    else if((mth==6) | (mth==7) | (mth==8)){
        qtr = 2;
    }
    else{
        qtr = 3;
    }
    return qtr;
}
function get_column(projid) {
	var conn = $.hdb.getConnection();
	//var projid = "000002";
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_002');
    var result = fndlreg(projid, null);
	conn.close();
	return result.OUTPUT_TABLE;    
}
function set_data() {
    //0. Get/ initialize variables
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var projid = $.request.parameters.get("id");
	var columninfo = get_column(projid);
	var oEntries = [];
	
	//1. Get the Excel data in object array format [{},{},{}]
	$.import("system-local.public.klai.DataLoader", "XLSX");
	var myxlsx = $['system-local'].public.klai.DataLoader.XLSX; 
	var data = myxlsx.XLSX.read(projid, $.request.entities[0].body.asArrayBuffer());
	
	//2. Get Operating Unit
	//var ou = data[0]._BIC_ER000484;
	
	//3. Get year
	//var year = data[1]._BIC_SH002889;
	
	//4. Get the quarter to be written in to table
	//var qtr = get_qtr();
	
	//5. Get next version to be loaded into hana table
	//var ver = get_version(ou,year,qtr);
	
	//6. Get submit user
	//var suser = get_username();
	
	//7. Get submit date
	//var sdate = get_date();
	
	//8. Get submit time
	//var stime = get_time();
	
	var schange = $.request.parameters.get("filename"); 
	
	//9. Create new object array with structure matching actual table
	for(var i=1; i<data.length; i++){
	    var oEntry = {};
	    for(var j=0; j<columninfo.length; j++){
	        oEntry[columninfo[j].COLUMN_NAME]  =   data[i][columninfo[j].COLUMN_NAME];
	        //oEntry[columninfo[j].COLUMN_NAME] = oEntry[columninfo[j].COLUMN_NAME].replace(/[^\x20-\x7E]|_x00[0|1][\d|[A-Z]]*_/g, "");
	        //if(columninfo[j].DATA_TYPE_NAME == "NVARCHAR" && oEntry[columninfo[j].COLUMN_NAME].length > columninfo[j].LENGTH){
	        //    oEntry[columninfo[j].COLUMN_NAME] = oEntry[columninfo[j].COLUMN_NAME].substr(0, columninfo[j].LENGTH);
	        //}
	        //if(columninfo[j].DATA_TYPE_NAME == "DECIMAL"){
	        //    oEntry[columninfo[j].COLUMN_NAME] = parseInt(oEntry[columninfo[j].COLUMN_NAME]) || 0;
	        //}
	    }
	    //oEntry.SOURCE = "FF";
	    //oEntry.LAST_DTM = timestamp;  
	    //oEntry.LAST_ACTION = "C";
	    //oEntry.LAST_CHANGED = schange;
        oEntries.push(oEntry);
	}
	
	//10. Start load procedure and execute insert procedure
	var templateinfo = get_templateinfo(projid);
	var proc_upload = conn.loadProcedure('KLAI', templateinfo[0].PROCNAME);
	proc_upload(oEntries);
	conn.commit();
	
	//11. Revert completion status
    $.response.setBody(JSON.stringify("Data Loaded"));
    $.response.status = $.net.http.OK;
	conn.close();
}
// Main function in charge of invoking different function base on parameter 'cmd'
var param = $.request.parameters.get('cmd');
switch (param) {
	case "set_data":    // invoke set data function
		set_data();
		break;
	case "upload":    // invoke set data function
		upload();
		break;
	default:
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody('Invalid Command: ' + param);
}