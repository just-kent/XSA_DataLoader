sap.ui.define([
		'sap/ui/core/mvc/Controller',
		"system-local/public/klai/DataLoader/model/formatter",
		"system-local/public/klai/DataLoader/controller/xlsx",
		'sap/viz/ui5/format/ChartFormatter',
		"sap/ui/model/Filter",
		"sap/m/MessageBox"
	], function(Controller, formatter, xlsx, Filter, FilterOperator, ChartFormatter, MessageBox) {
	"use strict";
	var myfile = "";
	var columntable = [];
	var templateinfo = {};
	return Controller.extend("system-local.public.klai.DataLoader.controller.dataloader", {
		formatter: formatter,
		onInit: function(oEvent) {
			//1. Initialize model for storing Project Register information
			var oRegModel = new sap.ui.model.odata.v2.ODataModel("./model/dl_reg.xsodata");
			this.getView().setModel(oRegModel, "dl_reg");

			//2. Initialize model for storing Table Column information
			this.oHdrModel = new sap.ui.model.odata.v2.ODataModel("./model/coltable.xsodata");
			this.getView().setModel(this.oHdrModel, "coltable");
			this.hdrtokens = [];

			//3. Initialize model for storing username detail
			var oUserModel = new sap.ui.model.json.JSONModel();
			oUserModel.loadData("./model/misc.xsjs?cmd=get_username");
			this.getView().setModel(oUserModel);

			//4. Initialize Viz Chart Container
			if (oEvent.getParameters("id").id != "__xmlview0") {
				this._initVizFrame(this);
				
		    //5. Initialize file name variable
		    this.filename = '';
			}
		},
		handleUploadComplete: function(oEvent){
            // If data loaded successfully, release the busy status of UI page
			this.getView().byId("pnl_dataloader").setBusy(false);
 		    
 		    if(oEvent.getParameter("status") === 200){
				// Upon completion of data load, trigger process to update user load statistics
				this._setStat(this);
				// Output load completion message
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			    sap.m.MessageBox.success(
    				"Data successfully loaded",
    				{
    					styleClass: bCompact? "sapUiSizeCompact" : ""
    				}
    			);
				//sap.m.MessageToast.show("Data successfully loaded");
 		    }else{
 		        var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			    sap.m.MessageBox.error(
    				"Data failed to be loaded!",
    				{
    					styleClass: bCompact? "sapUiSizeCompact" : ""
    				}
    			);
 		        //sap.m.MessageToast.show("Error! Data NOT loaded");
 		    }
            
		},
		onFuChange: function(e) {
			// This is to store the Excel name/ metadata information for latter used
			this.filename = e.getParameter("files")[0].name;
		},
		onHome1Press: function() {
			// Dummy function to navigate back to home page(if any)
			window.location = "launchpad.html";
		},
		handleExcelUpload: function(e) {
		    //1. Get all the needed variables
		    var uploader = this.getView().byId("fu_fileuploader");
		    var projid = this.getView().byId("s_projid").getSelectedKey();
		    var filename = this.filename;
		    uploader.setSendXHR(true);
            
            //2. Set the UI5 page to busy to indicate upload in progress
			this.getView().byId("pnl_dataloader").setBusy(true);
			        
		    //3. Fetch selected table information from xsjs (table column information)
			var url = './model/dl_reg.xsjs?cmd=get_templateinfo&projid=' + projid;
			jQuery.ajax({
				url: url,
				method: 'GET',
				dataType: 'json',
				success: function(data) {
					//1. Set the output Column infomation to global variable
					templateinfo = data.OUTPUT_TABLE[0];
					//2. Start the Upload request to server side!!!
					uploader.setUploadUrl(templateinfo.XSJSNAME+'.xsjs?cmd=set_data' + "&id=" + projid + "&filename=" + filename);
		            uploader.upload();
				},
				error: function() {}
			});
		    
            // Comments below just a reminder of alternative method to write back to HANA using client side library		    
// 			//1. Get the selected Project ID
// 			var projid = this.getView().byId("s_projid").getSelectedKey();

// 			//2. Trigger function to start process Excel file
// 			this._setDLModel(projid, this);

// 			//3. Set the UI5 page to busy to indicate upload in progress
// 			this.getView().byId("pnl_dataloader").setBusy(true);
		},
		_setDLModel: function(projid, self) {
			// Fetch selected table information from xsjs (table column information)
			var url = './model/dl_reg.xsjs?cmd=get_templateinfo&projid=' + projid;
			jQuery.ajax({
				url: url,
				method: 'GET',
				dataType: 'json',
				success: function(data) {
					//1. Set the output Column infomation to global variable
					templateinfo = data.OUTPUT_TABLE[0];
					//2. Get the table header information from the Project Register table 
					self._getHeader(projid, self);
				},
				error: function() {}
			});
		},
		_getHeader: function(projid, that) {
			//1. Create new filter object to be used to filter the OData result latter
			var myfilter = [new sap.ui.model.Filter({
				path: 'PROJID',
				operator: sap.ui.model.FilterOperator.EQ,
				value1: projid
			})];
			//2. Create new sorter object to be used to by Sequence Number latter
			var mysorter = [new sap.ui.model.Sorter("SEQ")];

			//3. Trigger OData function to load/ read dataset based on defined filter and sorter to get user defined table column information
			that.oHdrModel.read("/coltable", {
				filters: myfilter,
				sorters: mysorter,
				success: function(data, response) {
					// Once table header information retrieved, saved into array as Tokens object to be inserted to MultiInput control latter
					for (var i = 0; i < data.results.length; i++) {
						that.hdrtokens[parseInt(data.results[i].SEQ) - 1] = data.results[i].COLUMN_NAME;
					}
					// Get the actual HDBTABLE column information
					that._getTableColumn(projid, that);
				}
			});
		},
		_getTableColumn: function(projid, self) {
			//Send XSJS request to retrieved actual HDBTABLE column information
			var url = './model/dl_reg.xsjs?cmd=get_column&projid=' + projid;
			jQuery.ajax({
				url: url,
				method: 'GET',
				dataType: 'json',
				success: function(data) {
					// At this stage, all the needed information to prepare for Excel upload is done.
					// Next, trigger the actual Excel data extraction and upload process
					self._import(myfile, data, self);
				},
				error: function() {}
			});
		},
		_import: function(file, coltab, self) {
			//1. Initialize variable
			var header = [];
			columntable = coltab;
			var tablen = Object.keys(coltab.OUTPUT_TABLE).length;

			//2.If there are predefined column names registered, used the defined column name to map with the Excel file
			// Else, use the actual HDBTABLE column list to map. (Assuming it is one-to-one relationship between Excel and HDBTABLE)
			if (self.hdrtokens.length > 0) {
				header = self.hdrtokens;
			} else {
				for (var i = 0; i < tablen; i++) {
					header.push(columntable.OUTPUT_TABLE[i].COLUMN_NAME);
				}
			}
			//3. Start of actual Excel extraction logic using Open Source JavaScript function XLSX.js 
			if (file && window.FileReader) {
				var reader = new FileReader();
				var result = {},
					data;
				reader.onload = function(e) {
					data = e.target.result;
					var wb = XLSX.read(data, {
						type: 'binary'
					});
					wb.SheetNames.forEach(function(sheetName) {
						var roa = XLSX.utils.sheet_to_row_object_array(wb.Sheets[sheetName], // there are option to force header name and ignore header lines
							{
								header: header,
								range: parseInt(templateinfo.ROWS)
							}); //header:["PMRID","PMR_DESC","UOM","Q1","Q2","Q3","Q4"], range:1}
						if (roa.length > 0) {
							result[sheetName] = roa;
						}
					});
					//4. Prepare the extracted Excel content in Object Array and send for uploading
					self.excelDetail(result, self);
					return result;
				};
				reader.readAsBinaryString(file);
			}
		},
		excelDetail: function(result, self) {
			//1. Get the first Sheet within the Excel workbook. (Object.keys(result)[0] = 'Sheet1')
			var data = result[Object.keys(result)[0]];
			//2. Prepared the xsjs service url to be called later
			var url = templateinfo.XSJSNAME;
			//3. Stringify the to be loaded Object Array into plain JSON format
			var string = JSON.stringify(data);
			self.hdrtokens = [];

			//4. Actual calling XSJS service to post the data into HDBTABLE
			jQuery.ajax({
				url: url,
				method: 'POST',
				dataType: 'json',
				data: {
					JSON_DATA: string
				},
				success: function(data) {
					// If data loaded successfully, release the busy status of UI page
					self.getView().byId("pnl_dataloader").setBusy(false);
					// Upon completion of data load, trigger process to update user load statistics
					self._setStat(self);
					// Output load completion message
					var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
				    sap.m.MessageBox.success(
        				"Data successfully loaded.",
        				{
        					styleClass: bCompact? "sapUiSizeCompact" : ""
        				}
        			);
					//sap.m.MessageToast.show("Data successfully loaded");
				},
				error: function(e) {
					// If error occur during data load, output error message to user
					self.getView().byId("pnl_dataloader").setBusy(false);
					var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
				    sap.m.MessageBox.error(
        				"Data failed to be laoded.",
        				{
        					styleClass: bCompact? "sapUiSizeCompact" : ""
        				}
        			);
					//sap.m.MessageToast.show("FAILED! Data not loaded!");
				}
			});
			//Comments below only as a note to remind for alternative method of writing back to Hana table
			//1. Define oData model - var oModel = new sap.ui.model.odata.v2.ODataModel("./model/dataloader.xsodata");
			//2. Create entry - oModel.createEntry("dataloader", {Properties:{_BIC_ER000288:"H12345",_BIC_ER000484:"102005"}});
			//3. Submit changes - oModel.submitChanges({success:function(data){alert("success");},error:function(e){alert("Error")});
		},
		//   submitSuccess: function(oData,self){
		//       self.getView().byId("pnl_dataloader").setBusy(false);
		//       if (oData.__batchResponses[0].response){
		//                 sap.m.MessageToast.show("Error while loading into HANA");
		//             }
		//         else{
		//             sap.m.MessageToast.show("Data successfully loaded into HANA");
		//         }
		//   },

		//   insert_property: function(data,len,i){
		//       var tableproperty = {};
		//       for(var j=0 ; j<len ; j++ ){
		// 	   	 tableproperty[columntable.OUTPUT_TABLE[j].COLUMN_NAME] = data[i][columntable.OUTPUT_TABLE[j].COLUMN_NAME];
		//       }
		//         return tableproperty;
		//   },
		_initVizFrame: function(that, id, user) {
			//1. Initialize Viz controls
			var oVizFrame = that.getView().byId("idVizFrameStackedColumn");
			//2. Initialize JSON model to stored user load statistics
			that.oModel = new sap.ui.model.json.JSONModel();
			that.oModel.loadData("./model/LoadStat.xsjs?cmd=get_stat&projid=" + id + "&user=" + user);
            
            var oPopOver = this.getView().byId("idPopOver");
            oPopOver.connect(oVizFrame.getVizUid());
            
			//3. Set the data binding mapping to Viz component
			var oDataset = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
						name: "YEAR",
						value: "{YEAR}"
					},
					{
						name: "MONTH",
						value: "{MONTH}"
                    }],

				measures: [{
					name: "COUNT",
					value: "{COUNT}"
				}],

				data: {
					path: "/STAT"
				}
			});
			oVizFrame.setDataset(oDataset);
			oVizFrame.setModel(that.oModel);
			oVizFrame.setVizType("stacked_column");

			//4. Set the Viz component properties (Title, allignment, etc...)
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range()
				},
				title: {
					visible: true,
					text: 'User Load Statistics by Year and Month'
				}
			});
			var feedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					'uid': "valueAxis",
					'type': "Measure",
					'values': ["COUNT"]
				}),
				feedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					'uid': "categoryAxis",
					'type': "Dimension",
					'values': ["YEAR"]
				}),
				feedColor = new sap.viz.ui5.controls.common.feeds.FeedItem({
					'uid': "color",
					'type': "Dimension",
					'values': ["MONTH"]
				});
			oVizFrame.addFeed(feedValueAxis);
			oVizFrame.addFeed(feedCategoryAxis);
			oVizFrame.addFeed(feedColor);
            
            oVizFrame.setVizProperties({
                general: {
                    layout: {
                        padding: 0.04
                    }
                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        style: {
                            color: null
                        }
                    }
                },
                legend: {
                    title: {
                        visible: false
                    }
                }
            });
		},
		_onSelectChange: function(oEvent) {
			// Act as trigger to render the Chart area upon user select Project ID
			var id = this.getView().byId("s_projid").getSelectedKey();
			var user = this.getView().getModel().oData.user;
			this.oModel.loadData("./model/LoadStat.xsjs?cmd=get_stat&projid=" + id + "&user=" + user);
		},
		_setStat: function(self) {
			// Write back function to User Statistics table
			var id = this.getView().byId("s_projid").getSelectedKey();
			var user = this.getView().getModel().oData.user;

			var url = './model/LoadStat.xsjs?cmd=set_stat&projid=' + id + '&user=' + user;
			jQuery.ajax({
				url: url,
				method: 'GET',
				dataType: 'json',
				success: function() {
					self.oModel.loadData("./model/LoadStat.xsjs?cmd=get_stat&projid=" + id + "&user=" + user);
				},
				error: function() {
				    var bCompact = !!self.getView().$().closest(".sapUiSizeCompact").length;
				    sap.m.MessageBox.error(
        				"Statistics data not updated due to error.",
        				{
        					styleClass: bCompact? "sapUiSizeCompact" : ""
        				}
        			);
					//sap.m.MessageToast.show("Statistics data not updated due to error");
				}
			});
		}
	});
});