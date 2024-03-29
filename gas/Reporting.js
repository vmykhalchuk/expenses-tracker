function _reportingManTest() {
  //Reporting.inst.reinitializeSs();
  console.log(Reporting.inst.getSsUrl());
  console.log(ReportingPinkCloud.i.getSsUrl());
  //recreateMenu();
}

class Reporting {
  
  static get inst() {
    if (!this._inst) {
      this._inst = new this();
    }
    return this._inst;
  }
  
  static get i() {
    return this.inst;
  }
  
  constructor() {
    this.propIdKey = "Reporting_ZReportingID";
    this.propUrlKey = "Reporting_ZReportingURL";
  }
  
  getSsUrl() {
    return PropertiesService.getScriptProperties().getProperty(this.propUrlKey);
  }
  
  initializeSs() {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    
    var ssId = PropertiesService.getScriptProperties().getProperty(this.propIdKey);
    if (!ssId) {
      // we need to check again, in case it has been initialized before we locked
      this._createSpreadsheetFile();
      this._createAllSheets();
      recreateMenu(); // recreate Nav and Z menus (if no reporting SS was there yet)
    }
    
    lock.releaseLock();
  }
  
  deleteSs() {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    
    var ssId = PropertiesService.getScriptProperties().getProperty(this.propIdKey);
    if (ssId) {
      DriveApp.getFileById(ssId).setTrashed(true);
      PropertiesService.getScriptProperties().deleteProperty(this.propIdKey);
      PropertiesService.getScriptProperties().deleteProperty(this.propUrlKey);
    }
    
    lock.releaseLock();
  }
  
  reinitializeSs() {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    
    var ssId = PropertiesService.getScriptProperties().getProperty(this.propIdKey);
    if (!ssId) {
      this.initializeSs();
    } else {
      this._loadSpreadsheetFile(ssId);
      this._createDummySheetAndRemoveOtherSheets();
      this._createAllSheets();
    }
    
    lock.releaseLock();
  }
  
  _getSpreadsheetFileName() {
    return "Y - 📊Reporting";
  }
  
  _createAllSheets() {
    this._createDataIngestSheet();
    this._createMonthlyReportSheet();
    this._createWeeklyReportSheet();
    this._createDataForSearchSheet();
  }
  
  _createSpreadsheetFile() {
    this.reportingSs = SpreadsheetApp.create(this._getSpreadsheetFileName());
    PropertiesService.getScriptProperties().setProperty(this.propIdKey, this.reportingSs.getId());
    PropertiesService.getScriptProperties().setProperty(this.propUrlKey, this.reportingSs.getUrl());
  }
  
  _loadSpreadsheetFile(ssId) {
    this.reportingSs = SpreadsheetApp.openById(ssId);
  }
  
  _createDummySheetAndRemoveOtherSheets() {
    var dSheet = this.reportingSs.insertSheet("-Dummy-", 0);
    var sheets = this.reportingSs.getSheets();
    for (var i = 1; i < sheets.length; i++) {
      this.reportingSs.deleteSheet(sheets[i]);
    }
  }
  
  _createDataIngestSheet() {
    var diSheet = this.reportingSs.getActiveSheet();
    diSheet.setName("Data Ingest");
    var mainSsId = _sheets.getMainSsId();
    var aidTxValuesRange = _c.sheets.aidTx.name + "!A3:Q";
    var archTxValuesRange = _c.sheets.archTx.name + "!A3:Q";
    var inTxValuesRange = _c.sheets.inTx.name + "!A3:Q";
    
    var ingestFormula = '=QUERY({' +
      'IMPORTRANGE("' + mainSsId + '", "' + aidTxValuesRange + '");' +
        'IMPORTRANGE("' + mainSsId + '", "' + archTxValuesRange + '");' +
          'IMPORTRANGE("' + mainSsId + '", "' + inTxValuesRange + '")},' +
            '"SELECT Col3, Col4, Col5, Col7, Col10, Col11, Col16, Col17 ' +
              "WHERE Col3 > date '2011-11-17' AND Col11<>'_none' AND Col11<>'_other' " +
                "AND Col11<>'_split_2' AND Col11<>'_split_3' AND Col11<>'_split_4' AND Col11<>''\")";
    
    var headerColNames = [["TX Date", "Amount", "Currency", "Mono\nMCC",
                           "Tx Type", "Exp Type", "Misc\nSub Type", "House\nSub Type"]];
    
    var headerRowRange = diSheet.getRange(1, 1, 1, headerColNames[0].length);
    headerRowRange.setValues(headerColNames)
    .setFontWeight("bold")
    .setBackground("lightgray");
    
    diSheet.getRange(2,1).setFormula(ingestFormula).setBackground("lightgray");
    
    diSheet.setFrozenRows(1);
    diSheet.deleteColumns(diSheet.getLastColumn() + 1, diSheet.getMaxColumns() - diSheet.getLastColumn());
    diSheet.protect().setWarningOnly(true);
  }
  
  _createDataForSearchSheet() {
    var diSheet = this.reportingSs.insertSheet("Data for Search");
    
    var mainSsId = _sheets.getMainSsId();
    var aidTxValuesRange = _c.sheets.aidTx.name + "!A3:Q";
    var archTxValuesRange = _c.sheets.archTx.name + "!A3:Q";
    var inTxValuesRange = _c.sheets.inTx.name + "!A3:Q";
    
    var ingestFormula = '=QUERY({' + 
      'IMPORTRANGE("' + mainSsId + '", "' + aidTxValuesRange + '");' +
        'IMPORTRANGE("' + mainSsId + '", "' + archTxValuesRange + '");' +
          'IMPORTRANGE("' + mainSsId + '", "' + inTxValuesRange + '")},' +
            "\"SELECT Col3, year(Col3)*10000+(month(Col3)+1)*100+day(Col3), Col4, Col5, Col7, Col10, Col11, Col16, Col17,  Col8,Col9,Col14 " +
              "WHERE Col3 > date '2011-11-17' AND Col11<>'_none' AND Col11<>'_other' " +
                "AND Col11<>'_split_2' AND Col11<>'_split_3' AND Col11<>'_split_4' AND Col11<>''\")";
    
    var headerColNames = [["TX Date", "Date to sort", "Amount", "Currency", "Mono\nMCC",
                           "Tx Type", "Exp Type", "Misc\nSub Type", "House\nSub Type",
                           "Mono\nDescription", "Mono\nComment", "My Comment", "", "Date to sort", "Date to sort"]];
    
    var headerRowRange = diSheet.getRange(1, 1, 1, headerColNames[0].length);
    headerRowRange.setValues(headerColNames)
    .setFontWeight("bold").setBackground("lightgray");
    
    diSheet.getRange(2,1).setFormula(ingestFormula)
    .setBackground("lightgray");
    
    diSheet.getRange("N2").setFormula("=ARRAYFORMULA(YEAR(A2:A)*10000+MONTH(A2:A)*100+DAY(A2:A))")
    .setBackground("lightgray");
    diSheet.getRange("O2").setFormula('=ARRAYFORMULA(YEAR(A2:A)&"-"&MONTH(A2:A)&"-"&DAY(A2:A))')
    .setBackground("lightgray");
    
    diSheet.hideRows(2);
    diSheet.setFrozenRows(2);
    diSheet.deleteColumns(diSheet.getLastColumn() + 1, diSheet.getMaxColumns() - diSheet.getLastColumn());
    diSheet.protect().setWarningOnly(true);
  }
  
  _createMonthlyReportSheet() {
    var mrSheet = this.reportingSs.insertSheet("Report Monthly");
    
    mrSheet.getRange("E2").setValue("YEAR:");
    mrSheet.getRange("E3").setValue("MONTH:");
    mrSheet.getRange("F2").setFormula('=ARRAYFORMULA(IF(ISBLANK(F4:ZZ4),"",FLOOR(F4:ZZ4 / 100)))');
    mrSheet.getRange("F3").setFormula('=ARRAYFORMULA(IF(ISBLANK(F4:ZZ4),"",MOD(F4:ZZ4,100)))');
    mrSheet.getRange("E2:F3").setBackground("lightgray");

    mrSheet.getRange("A2:ZZ3").setFontWeight("bold");
    
    var isName = "Data Ingest";
    var txDateRage = "'" + isName + "'!A2:A";
    var otherDataRange = "'" + isName + "'!B2:H";
    var formula = "=query({ArrayFormula(if(len(" + txDateRage + "),(YEAR(" + txDateRage + ")*100+MONTH(" + txDateRage + ")),))," +
      "query(" + otherDataRange + ")}," +
        "\"Select Col3,Col6,Col7,Col8,Sum(Col2) where Col1>0 group by Col6,Col7,Col8,Col3 Pivot Col1 Label Col3'D/M'\",0)";
    mrSheet.getRange("B4").setFormula(formula).setBackground("lightgray");
    
    mrSheet.getRange("A5:ZZ50").setNumberFormat("#,##0.00");
    
    for (var i = 5; i <= 50; i++) {
      mrSheet.getRange("A" + i).setFormula("=SUM(F" + i + ":" + i + ")")
    }
    mrSheet.getRange("A5:A50").setFontWeight("bold").setBackground("lightgray");
    
    // experimental part:
    mrSheet.getRange("A1").setFormula('=SPARKLINE(E6:6,{"charttype","column";"axis",true;"axiscolor","blue";"color","red";"negcolor","black"})');
    
    mrSheet.hideRows(4);
    mrSheet.setFrozenColumns(5);
    mrSheet.setFrozenRows(4);
    
    SpreadsheetApp.flush();
    mrSheet.autoResizeColumns(1, 5);
    
    mrSheet.protect().setWarningOnly(true);
  }
  
  _createWeeklyReportSheet() {
    var wrSheet = this.reportingSs.insertSheet("Report Weekly");
    
    wrSheet.getRange("E2").setValue("YEAR:");
    wrSheet.getRange("E3").setValue("WEEK:");
    wrSheet.getRange("F2").setFormula('=ARRAYFORMULA(IF(ISBLANK(F4:ZZ4),"",FLOOR(F4:ZZ4 / 100)))');
    wrSheet.getRange("F3").setFormula('=ARRAYFORMULA(IF(ISBLANK(F4:ZZ4),"",MOD(F4:ZZ4,100)))');
    wrSheet.getRange("E2:F3").setBackground("lightgray");

    wrSheet.getRange("A2:ZZ3").setFontWeight("bold");
    
    var isName = "Data Ingest";
    var txDateRage = "'" + isName + "'!A2:A";
    var otherDataRange = "'" + isName + "'!B2:H";
    var formula = "=query({ArrayFormula(if(len(" + txDateRage + "),(YEAR(" + txDateRage + ")*100+WEEKNUM(" + txDateRage + ")),))," +
      "query(" + otherDataRange + ")}," +
        "\"Select Col3,Col6,Col7,Col8,Sum(Col2) where Col1>0 group by Col6,Col7,Col8,Col3 Pivot Col1 Label Col3'D/W'\",0)";
    wrSheet.getRange("B4").setFormula(formula).setBackground("lightgray");
    
    wrSheet.getRange("A5:ZZ50").setNumberFormat("#,##0.00");
    
    for (var i = 5; i <= 50; i++) {
      wrSheet.getRange("A" + i).setFormula("=SUM(F" + i + ":" + i + ")")
    }
    wrSheet.getRange("A5:A50").setFontWeight("bold").setBackground("lightgray");
    
    wrSheet.hideRows(4);
    wrSheet.setFrozenColumns(5);
    wrSheet.setFrozenRows(4);
    
    SpreadsheetApp.flush();
    wrSheet.autoResizeColumns(1, 5);
    
    wrSheet.protect().setWarningOnly(true);

    const richText = SpreadsheetApp.newRichTextValue()
    .setText("US Week Numbers here:")
    .setLinkUrl("https://www.timeanddate.com/calendar/?year=2021&country=1&wno=1")
    .build();
    wrSheet.getRange("A1").setRichTextValue(richText).setFontWeight("bold").setBackground("lightgray");
  }
  
}
