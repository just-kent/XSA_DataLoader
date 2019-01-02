function get_username() {
	$.response.contentType = "application/json";
	var output = "";
	var userName = $.session.getUsername();
	output =  '{ "user": "' + userName + '"}';
	$.response.setBody(output);
}

var param = $.request.parameters.get('cmd');  
switch (param) {  
case "get_username":  
          get_username();  
          break;  
default:  
          $.response.status = $.net.http.INTERNAL_SERVER_ERROR;  
          $.response.setBody('Invalid Command: '+param);  
}  