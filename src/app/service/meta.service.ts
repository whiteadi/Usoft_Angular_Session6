import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetaService {

  // API end-point URL
  private readonly apiURL = environment.apiUrl;
  private readonly apiRoot = environment.apiRoot;

  constructor(private http: HttpClient) { }

  // Http Options
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${environment.user}:${environment.password}`)
    })
  }

  httpOptionsPost = {
    headers: new HttpHeaders({
      'Content-Type': 'text/xml',
      'Accept': 'application/xml',
      'Authorization': 'Basic ' + btoa(`${environment.user}:${environment.password}`)
    })
  }


  resolveMeta(tableName: string): Observable<any> {
    return this.http.get(this.apiURL + `/meta/${tableName}`, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  resolveMetaRelations(tableName: string): Observable<any> {
    return this.http.get(this.apiRoot + `/TableColumns/relations/${tableName}`, { ...this.httpOptions, responseType: 'text' })
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  resolvePost(tableName: string, rowData: any): Observable<any> {
    console.log('Your form data : ', rowData);
    const newRow = `<${tableName} ${rowData} />`;
    return this.http.post(this.apiURL + `/${tableName}`, newRow, { ...this.httpOptionsPost, responseType: 'text' })
      .pipe(
        catchError(this.handleError)
      );
  }

  resolvePut(tableName: string, primaryKeysWithValues: string, rowData: any): Observable<any> {
    const newRow = `<${tableName} ${rowData} />`;
    return this.http.put(this.apiURL + `/${tableName}${primaryKeysWithValues}`, newRow, { ...this.httpOptionsPost, responseType: 'text' })
      .pipe(
        catchError(this.handleError)
      );
  }


  resolveDelete(tableName: string, primaryKeysWithValues: string): Observable<any> {
    return this.http.delete(this.apiURL + `/${tableName}${primaryKeysWithValues}`, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  resolveGet(tableName: string): Observable<any> {
    return this.http.get(this.apiURL + `/${tableName}` + '?LeadingZeroForDecimal=yes', this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  resolveMetaTables(): Observable<any> {
    return this.http.get(this.apiURL + '/tables', this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  resolveMetaColumns(tableName: string): Observable<any> {
    return this.http.get(this.apiRoot + `/TableColumns/columns/${tableName}`, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  resolveGetPK(tableName: string, pkName: string): Observable<any> {
    return this.http.get(this.apiURL + `/${tableName}/columns;${pkName}` + '?LeadingZeroForDecimal=yes', this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // Error handling 
  handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    window.alert(errorMessage);
    return throwError(errorMessage);
  }
}
