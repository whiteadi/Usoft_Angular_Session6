import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';

import * as xml2js from 'xml2js';

import { MetaService } from '../service/meta.service';

interface Column {
  $: { COLUMN_NAME: string, PRIMARY_KEY: string, FOREIGN_KEY: string, MANDATORY: string, INPUT_ALLOWED: string },
  Domain: [{ $: { DATABASE_TYPE: string, SEQNO_TYPE: string } }]
}

interface columnValue {
  NAME: string,
  TYPE: string,
  FK: boolean,
  MANDATORY: boolean,
  INPUT_ALLOWED: boolean,
  PK: boolean,
  SEQ: boolean
}

interface Relationship {
  $: { PARENT_TABLE: string, CHILD_TABLE: string },
  Relationship_Columns: [{ Column: [{ $: { PARENT: string, CHILD: string } }] }]
}

interface relValue {
  PARENT_TABLE: string,
  CHILD_TABLE: string,
  FK_COLUMN: string,
  PK_COLUMN: string
}

@Component({
  selector: 'app-crud-grid',
  templateUrl: './crud-grid.component.html',
  styleUrls: ['./crud-grid.component.css']
})
export class CrudGridComponent implements OnInit {

  TablesMeta: any = [];
  ColumnsMeta: any = {};

  columnDefs: any[];
  rowData: any[];

  selectedTable: string;
  columns: columnValue[];
  pKs: any[];
  RelationsMeta: any = {};
  fKs: any[];
  fkValues: any[] = [];


  private gridApi;

  constructor(private metaService: MetaService) { }

  ngOnInit(): void {
    this.loadTablesMeta();
  }

  onTableChange(ob: { value: { tablename: string } }) {
    let selectedTable = ob.value;
    this.selectedTable = selectedTable.tablename;
    return this.metaService.resolveMetaColumns(selectedTable.tablename).subscribe((data: [{ columns: string }]) => {
      const p: xml2js.Parser = new xml2js.Parser();
      p.parseString(data[0].columns, (err, result) => {
        if (err) {
          throw err;
        }
        const allMeta = JSON.parse(JSON.stringify(result, null, 4)); //format your json output
        this.ColumnsMeta = allMeta.Meta.Columns[0].Column;
        this.fetchRelations();
        this.getColumns(this.ColumnsMeta);
        this.loadTableValues(selectedTable.tablename);
      })
    })
  }

  columnReducer(allColumns: columnValue[], row: Column): columnValue[] {
    const columnName = row.$?.COLUMN_NAME;
    const isPK = row.$?.PRIMARY_KEY === 'Y';
    const type = row.Domain[0]?.$?.DATABASE_TYPE;
    const isFK = row.$?.FOREIGN_KEY === 'Y';
    const isMandatory = row.$?.MANDATORY === 'Y';
    const inputallowed = row.$?.INPUT_ALLOWED === 'Y';
    const isDbSeq = row.Domain[0]?.$?.SEQNO_TYPE === 'RDMBS';
    const jsonValue = {
      NAME: columnName,
      TYPE: type,
      FK: isFK,
      MANDATORY: isMandatory,
      INPUT_ALLOWED: inputallowed,
      PK: isPK,
      SEQ: isDbSeq
    };
    allColumns.push(jsonValue);
    return allColumns;
  }

  getColumns(metaColumns: Column[]): columnValue[] {
    const columns = metaColumns.reduce(this.columnReducer, []);
    this.columnDefs = columns.map(column => {
      const headerName = column.NAME.charAt(0).toUpperCase() + column.NAME.slice(1);
      const field = column.NAME;
      const sortable = true;
      const filter = true;
      const editable = !column.PK;
      return { headerName, field, sortable, filter, editable };
    });
    this.pKs = this.getPks(columns);
    this.columns = columns;
    return columns;
  }

  getPks(columns: columnValue[]): columnValue[] {
    return columns.filter(column => column.PK);
  }

  getFks(relations: relValue[]): relValue[] {
    return relations.filter(rel => rel.CHILD_TABLE === this.selectedTable);
  }

  relationReducer(allRelations: relValue[], row: Relationship): relValue[] {
    const childTabke = row.$?.CHILD_TABLE;
    const parentTable = row.$?.PARENT_TABLE;
    const columnFK = row.Relationship_Columns[0]?.Column[0].$.CHILD;
    const parentColumnPK = row.Relationship_Columns[0].Column[0].$.PARENT;
    const jsonValue = {
      PARENT_TABLE: parentTable,
      CHILD_TABLE: childTabke,
      FK_COLUMN: columnFK,
      PK_COLUMN: parentColumnPK
    };
    allRelations.push(jsonValue);
    return allRelations;
  }

  getRelations(fetchedRelations: Relationship[]): relValue[] {
    if (fetchedRelations?.length > 0) {
      const rels = fetchedRelations.reduce(this.relationReducer, []);
      this.fKs = this.getFks(rels);
      this.getFKValues();
      return rels;
    } else {
      return [];
    }
  }

  getFKValues() {
    this.fKs.map((value: relValue) => {
      this.metaService.resolveGetPK(value.PARENT_TABLE, value.PK_COLUMN).subscribe((data: {}) => {
        const fetchedFK = data[value.PARENT_TABLE].map(fkdata => fkdata[value.PK_COLUMN]);
        this.fkValues[value.FK_COLUMN] = fetchedFK;
      });
    });
  }

  fetchRelations() {
    this.metaService.resolveMetaRelations(this.selectedTable).subscribe((data: string) => {
      const p: xml2js.Parser = new xml2js.Parser();
      p.parseString(data, (err, result) => {
        if (err) {
          throw err;
        }
        const allRelationsMeta = JSON.parse(JSON.stringify(result, null, 4)); //format your json output
        this.RelationsMeta = allRelationsMeta.Meta?.Relationships[0]?.Relationship;
        this.getRelations(this.RelationsMeta);
      })
    })
  }

  // Get tables meta
  loadTablesMeta() {
    return this.metaService.resolveMetaTables().subscribe((data: { Resources: [] }) => {
      this.TablesMeta = data.Resources;
    })
  }

  // Get table values
  loadTableValues(tablename: string) {
    return this.metaService.resolveGet(tablename).subscribe((data: {}) => {
      this.rowData = data[tablename.toUpperCase()];
    })
  }

  getSelectedRowData() {
    let selectedData = this.gridApi.getSelectedRows();
    selectedData.forEach(element => {
      const primaryKeysWithValues = this.pKs.reduce((pkString, column) => {
        return pkString.concat(";", column.NAME, "=", element[column.NAME]);
      }, '');
      console.log('delete person with id:', primaryKeysWithValues);
      /**
      this.metaService.resolveDelete(`${this.selectedTable}`, primaryKeysWithValues).subscribe(
        (val) => {
          console.log("DELETE call successful value returned in body",
            val);
        },
        response => {
          console.log("DELETE call in error", response);
        },
        () => {
          console.log("The DELETE observable is now completed.");
        });
         */
    });
    return selectedData;
  }

  onCellValueChanged(event) {
    // we need to create the primaryKeysWithValues in the form of a PK1=value;PK2=value
    const primaryKeysWithValues = this.pKs.reduce((pkString, column) => {
      return pkString.concat(";", column.NAME, "=", event.data[column.NAME]);
    }, '');
    console.log(
      'primaryKeysWithValues: ' + primaryKeysWithValues
    );
    return this.metaService.resolvePut(`${this.selectedTable}`, primaryKeysWithValues, `${event.colDef.field}="${event.newValue}"`).subscribe(
      (val) => {
        console.log("PUT call successful value returned in body",
          val);
      },
      response => {
        console.log("PUT call in error", response);
      },
      () => {
        console.log("The PUT observable is now completed.");
      });
  }

  reduce(obj: object, initialValue: string) {
    return Object.entries(obj).reduce(
      (prev, [key, value]) => prev.concat(
        key,
        '="',
        value,
        '" '
      ),
      initialValue
    )
  };

  onSubmit(myform: NgForm) {
    const rowData = this.reduce(myform.value, "");
    return this.metaService.resolvePost(this.selectedTable.toUpperCase(), rowData).subscribe(
      (val) => {
        console.log("POST call successful value returned in body",
          val);
        this.loadTableValues(this.selectedTable);
        myform.reset();
      },
      response => {
        console.log("POST call in error", response);
      },
      () => {
        console.log("The POST observable is now completed.");
      });
  }

  onGridReady(params) {
    this.gridApi = params.api;
  }

}
