sap.ui.define([
		'jquery.sap.global',
		'sap/ui/core/Fragment',
		'sap/ui/core/mvc/Controller',
		'sap/ui/model/json/JSONModel',
		"sap/ui/core/routing/History",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"xsa_dlregui/model/formatter"
	], function(jQuery, Fragment, Controller, JSONModel, History, MessageToast, MessageBox, formatter) {
	"use strict";
	var oID = "";
	return Controller.extend("xsa_dlregui.controller.reg_dlform", {
		formatter: formatter,
		onInit: function (oEvent) {

		    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
            this.tokenchanged = "";
		},

		_onObjectMatched: function (oEvent) {
			this.getView().bindElement({
				path: "/" + oEvent.getParameter("arguments").dlregPath, // <-- in Invoices.json we define data in manner of Invoices/"item". Hence we would need to include prefix "Invoices" here to construct the full path to selected item
				model: "dl_reg"
			});
			var that = this;
			this._showFormFragment("dlregform_edit");
			this.selectedid = oEvent.getParameter("arguments").dlregPath.split("'")[1];
			var hdrModel = new sap.ui.model.odata.v2.ODataModel("./coltable.xsodata");
			var myfilter = [new sap.ui.model.Filter({  
                                      path: 'PROJID',  
                                      operator: sap.ui.model.FilterOperator.EQ,  
                                      value1: this.selectedid  
                                 })];
                                 
            // Create new sorter object to be used to by Sequence Number latter
			var mysorter = [new sap.ui.model.Sorter("SEQ", null, function(oContext) {  
                                var v = oContext.getProperty("SEQ");  
                                return { key: parseInt(v), text: parseInt(v) };  
                            }  )];

			hdrModel.read("/coltable", {  
                         filters: myfilter,
                         sorters: mysorter,
                         success: function(data,response){
                             that.oriheader = data.results;
                             that._initHeaderVal(data.results);
                         }
			});
			this._initHdrMultiInp(this);
		},
		_initHeaderVal: function(data){
		    var hdrinput = this.getView().byId("i_header");

		    for(var i=0; i<data.length; i++){
		        var mytoken = new sap.m.Token({key: data[i].COLUMN_NAME, text: data[i].COLUMN_NAME});
		        hdrinput.addToken(mytoken);
		    }
		},
		_formFragments: {},
		dateText: function (sDate) {
			var date = new Date(sDate);
			return date.toLocaleDateString('en-GB');
		},
		onExit : function () {
			for(var sPropertyName in this._formFragments) {
				if(!this._formFragments.hasOwnProperty(sPropertyName)) {
					return;
				}

				this._formFragments[sPropertyName].destroy();
				this._formFragments[sPropertyName] = null;
			}
		},

		handleEditPress : function (oEvent) {

			//Clone the data
			var datetime = new Date(this.getView().getModel("event").getData(this.getView().getBindingContext("event").getPath()).DATE);
			this._toggleButtonsAndView(true);

		},
		
		onNavBack: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			this.getView().bindElement({
				path: "/dl_reg('000000')", // <-- in Invoices.json we define data in manner of Invoices/"item". Hence we would need to include prefix "Invoices" here to construct the full path to selected item
				model: "dl_reg"
			});

			this.getView().byId("i_projid").setValue("");
			this.getView().byId("i_proj").setValue(""); 
			this.getView().byId("i_createby").setValue("");
			this.getView().byId("i_createon").setValue("");
			this.getView().byId("i_schema").setValue("");
			this.getView().byId("i_table").setValue("");
			this.getView().byId("i_header").removeAllTokens();
			this.getView().byId("i_rows").setValue("");
			this.getView().byId("i_procschema").setValue("");
			this.getView().byId("i_procname").setValue("");
			this.getView().byId("i_xsjsname").setValue("");
			
			// Reset oData Model data
			sap.ui.getCore().byId("__component0---v_reg_dlOverview").getModel("dl_reg").refresh();
			this.getView().getModel("dl_reg").refresh(true, true);

			//this.getView().getModel("vendor").destroy();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
				
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("overview", true);
			}
		},
		attachReqComplete: function(self){
			// Attach event listener for Batch Request
			self.getView().getModel("event").attachBatchRequestCompleted(function(){
				// Force oData model from previous View to refresh itself
				var oPreView =  sap.ui.getCore().getElementById("__component0---v_eventOverview"); 
				oPreView.getModel("event").refresh(true);
			});
		},
		handleCancelPress : function () {

			this.onNavBack();

		},
		doAlert: function(self){
			alert("Update Successfull");
			
			// Reset the global variable oID 
			oID = "";
			
			// Reset oData Model data
			this.getView().getModel("event").refresh(true, true);
			
			this.onNavBack();
		},
		handleSavePress : function (oEvent) {
			var oEntry = {};
		    var procsel = "";
		    var self = this;
		    var oHdrEntry = {};
		    var date = this.getView().byId("i_createon").getValue();
		    oEntry.ID = this.getView().byId("i_projid").getValue();
		    oEntry.PROJ = this.getView().byId("i_proj").getValue();
		    oEntry.USER = this.getView().byId("i_createby").getValue();
		    oEntry.DATE = new Date(date.substr(6,4), date.substr(3,2)-1, parseInt(date.substr(0,2))+1);
		    oEntry.SCHEMA = this.getView().byId("i_schema").getValue();
		    oEntry.TABLE = this.getView().byId("i_table").getValue();
		    oEntry.HEADER = "";
		    oEntry.ROWS = this.getView().byId("i_rows").getValue();
		    oEntry.PROCSCHEMA = this.getView().byId("i_procschema").getValue();
		    oEntry.PROCNAME = this.getView().byId("i_procname").getValue();
		    oEntry.XSJSNAME = this.getView().byId("i_xsjsname").getValue();
            
            var updatepath = "/dl_reg(ID='" + oEntry.ID + "')";
				// Start perform update
				this.getView().getModel("dl_reg").update(updatepath, oEntry, {
					success: function(data){
					    self._updateHdr(self.getView().byId("i_header").getTokens(),oEntry.ID);
					    debugger;
					    var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
        			 //   sap.m.MessageBox.success(
            // 				"Successfully save changes",
            // 				{
            // 					styleClass: bCompact? "sapUiSizeCompact" : ""
            // 				}
            // 			);
					    sap.m.MessageToast.show("Changed Successfull");
					    self.onNavBack();
					    }, //need to show alert message and force update on Odata Model to reflect changes across controls
					error: function(e){
					   // var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
        // 			    sap.m.MessageBox.error(
        //     				"Failed to save changes.",
        //     				{
        //     					styleClass: bCompact? "sapUiSizeCompact" : ""
        //     				}
        //     			);
						sap.m.MessageToast.show("Alert! Failed to register");
						self.onNavBack();
					}
				});
				
		},
		_updateHdr: function(myTokens, myid){
		    var oHdrModel = new sap.ui.model.odata.ODataModel("./model/coltable.xsodata");
            //this.getView().setModel(oTabModel, "coltable");
            var batchChanges = [];
            var orichanges = [];
            debugger;
            if(this.tokenchanged == "X"){
                if(this.oriheader.length > 0){
                    for(var i=0; i<this.oriheader.length; i++){
                        var seq = i+1;
                        var updatepath = "/coltable(PROJID='" + myid + "',"+
        		                            "SEQ="+seq+")";
        		        orichanges.push(oHdrModel.createBatchOperation(updatepath, "DELETE"));
        		        oHdrModel.addBatchChangeOperations(orichanges); 
                    }
                    oHdrModel.setUseBatch(true);
                    oHdrModel.submitBatch(
                        function(event){
                            debugger;
                            oHdrModel.clearBatch();
                            for(var i=0; i<myTokens.length; i++){
                		        var seq = i+1;
                		        var oEntry = {};
                		        oEntry.PROJID = myid;
                		        oEntry.SEQ = seq;
                		        oEntry.COLUMN_NAME = myTokens[i].getText();
                		        var updatepath = "coltable";
                		        batchChanges.push(oHdrModel.createBatchOperation(updatepath, "POST", oEntry, null));
                                oHdrModel.addBatchChangeOperations(batchChanges); 
                		    }

                		  oHdrModel.setUseBatch(true);
                          oHdrModel.submitBatch();	
                        },
                        function(e){

                        });
                }else{
                    for(var i=0; i<myTokens.length; i++){
                		        var seq = i+1;
                		        var oEntry = {};
                		        oEntry.PROJID = myid;
                		        oEntry.SEQ = seq;
                		        oEntry.COLUMN_NAME = myTokens[i].getText();
                		        var updatepath = "coltable";
                		        batchChanges.push(oHdrModel.createBatchOperation(updatepath, "POST", oEntry, null));
                                oHdrModel.addBatchChangeOperations(batchChanges); 
                		    }
                		  oHdrModel.setUseBatch(true);
                          oHdrModel.submitBatch();	
                }
            }
		},
		_formFragments: {},

		_toggleButtonsAndView : function (bEdit) {
			var oView = this.getView();

			// Show the appropriate action buttons
			oView.byId("edit").setVisible(!bEdit);
			oView.byId("save").setVisible(bEdit);
			oView.byId("cancel").setVisible(bEdit);

			// Set the right form type
			this._showFormFragment(bEdit ? "eventchange" : "eventdisplay");
		},
		statusText: function (sStatus) {
			var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
			switch (sStatus) {
			case "A":
				return oResourceBundle.getText("eventStatusA");
			case "B":
				return oResourceBundle.getText("eventStatusB");
			case "C":
				return oResourceBundle.getText("eventStatusC");
			case "D":
				return oResourceBundle.getText("eventStatusD");
			case "E":
				return oResourceBundle.getText("eventStatusE");
			case "F":
				return oResourceBundle.getText("eventStatusF");
			default:
				return sStatus;
			}
		},
		_getFormFragment: function(sFragmentName){
		    var oFormFragment = this._formFragments[sFragmentName];

			if (oFormFragment) {
				return oFormFragment;
			}  
			oFormFragment = sap.ui.xmlfragment(this.getView().getId(), 
                			"xsa_dlregui.view." + sFragmentName, 
                			this.getView().getController());
			return this._formFragments[sFragmentName] = oFormFragment;
		},
		_showFormFragment : function (sFragmentName) {
			var oPage = this.getView().byId("p_dlregform");
			oPage.removeAllContent();
			oPage.insertContent(this._getFormFragment(sFragmentName));
		},
		_initHdrMultiInp: function(that){
        var oMultiInput1 = that.getView().byId("i_header");
		//*** add checkbox validator
		oMultiInput1.addValidator(function(args){
				var text = args.text;
				return new sap.m.Token({key: text, text: text});
		});
	},
		tokenValidation: function(oEvent){
		  this.tokenchanged = "X";
	}

	});

});