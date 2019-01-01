function get_nextid() {
	$.response.contentType = "text/html";
	var output = 0;
	var conn = $.hdb.getConnection();
	var pstmt = conn.prepareStatement( "SELECT TO_INT(MAX(ID)) from \"KLAI\".\"system-local.public.klai.DataLoader.model::dataloader.dl_reg\"" );
	var rs = pstmt.executeQuery();

	if (!rs.next()) {
	                $.response.setBody( "Failed to retrieve data" );
	                $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	}
	else {
	                output = rs.getInteger(1);
	}
	output = output + 1;
	rs.close();
	pstmt.close();
	conn.close();
	$.response.setBody(output);
	return output;
}
function get_column() {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var projid = $.request.parameters.get('projid');  
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_002');
    var result = fndlreg(projid, null);
	conn.close();
    $.response.setBody(JSON.stringify(result));
	return result;
}
function get_tablelist() {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_007');
    var result = fndlreg(null);
	conn.close();
    $.response.setBody(JSON.stringify(result));
	return result;
}
function get_proclist() {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_008');
    var result = fndlreg(null);
	conn.close();
    $.response.setBody(JSON.stringify(result));
	return result;
}
function get_schemalist() {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var proc = "";
	var objtype = $.request.parameters.get('objtype'); 

	switch(objtype){
	    case "hdbtable":  
        proc = "system-local.public.klai.DataLoader.procedure::DLREG_009"; 
        break;
        case "hdbprocedure":  
        proc = "system-local.public.klai.DataLoader.procedure::DLREG_010"; 
        break;
	}
	var fndlreg = conn.loadProcedure('KLAI', proc);
    var result = fndlreg(null);
	conn.close();
    $.response.setBody(JSON.stringify(result));
	return result;
}
function get_templateinfo() {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var projid = $.request.parameters.get('projid');  
	var fndlreg = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_003');
    var result = fndlreg(projid, null);
	conn.close();
    $.response.setBody(JSON.stringify(result));
	return result;
}
function get_columninfo(schemaname, tablename) {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var pd_colinfo = conn.loadProcedure('KLAI', 'system-local.public.klai.DataLoader.procedure::DLREG_005');
    var result = pd_colinfo(schemaname, tablename, null);
	conn.close();
    //$.response.setBody(JSON.stringify(result));
	return result;
}
function writesql(conn,sql) {
	//var conn = $.db.getConnection();
	var result = "";
	try {
	    //Note: conn.executeQuery - read only sql supported
	    //Note: conn.executeUpdate - support write/ create action
        var rs = conn.executeUpdate(sql);  
	} catch (e) {
		result = e.toString();
	}
	return result;
}
function create_proc() {
	$.response.contentType = "text/html";
	var conn = $.hdb.getConnection();
	var schemaname = $.request.parameters.get('schema');  
	var tablename = $.request.parameters.get('table');
	var procschema = $.request.parameters.get('procschema'); 
	var procname   = $.request.parameters.get('procname'); 
	var colinfo = get_columninfo(schemaname, tablename);
    var ttquery = "CREATE TYPE \""+procschema+"\".\"TT_"+procname+"\" AS TABLE(\n";
    var procquery = "CREATE PROCEDURE \""+procschema+"\".\""+procname+"\"(\n";
    var procbody = "INSERT INTO \""+schemaname+"\".\""+tablename+"\"\n SELECT * FROM :DATASET;\n";
    var columnsql = "";
    //1. Create Table Type
    for(var i=0; i<colinfo.COLUMNINFO.length; i++){
        columnsql = columnsql+colinfo.COLUMNINFO[i].COLUMN_NAME+" "+colinfo.COLUMNINFO[i].DATA_TYPE_NAME;
        if((colinfo.COLUMNINFO[i].DATA_TYPE_NAME == "VARCHAR") | (colinfo.COLUMNINFO[i].DATA_TYPE_NAME == "NVARCHAR") ){
            columnsql = columnsql+"("+colinfo.COLUMNINFO[i].LENGTH+")"
            if(i != (colinfo.COLUMNINFO.length - 1)){
                columnsql = columnsql+",\n";
                }
        }
        else{
            if(i != (colinfo.COLUMNINFO.length - 1)){
            columnsql = columnsql+",\n";
            }
        }
    }
    ttquery = ttquery + columnsql + ");";
    writesql(conn,ttquery);
    
    //2. Create Procedure
    procquery = procquery + "IN DATASET "+procschema+".\"TT_"+procname+"\")\n LANGUAGE SQLSCRIPT \n SQL SECURITY INVOKER \n AS \n BEGIN \n";
    procquery = procquery + procbody;
    procquery = procquery + "END;";
    var queryresult = writesql(conn,procquery);
    if(queryresult){
        $.response.setBody(JSON.stringify(queryresult));
        $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
    }
    else{
        $.response.setBody(JSON.stringify("Procedure Created"));
    	$.response.status = $.net.http.OK;
    }
	conn.close();
	
}

var param = $.request.parameters.get('cmd');  
switch (param) {  
case "get_id_next":  
     get_nextid();  
     break;
case "get_column":  
     get_column();  
     break;
case "get_templateinfo":  
     get_templateinfo();  
     break;
case "create_proc":  
     create_proc();  
     break;
case "get_tablelist":  
     get_tablelist();  
     break;     
case "get_proclist":  
     get_proclist();  
     break;
case "get_schemalist":  
     get_schemalist();  
     break; 
default:  
          $.response.status = $.net.http.INTERNAL_SERVER_ERROR;  
          $.response.setBody('Invalid Command: '+param);  
}  