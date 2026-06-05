import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { CompetitorDto } from '../models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  constructor(private readonly http: HttpClient) {}

  getCompetitors(competitionId: number): Observable<CompetitorDto[]> {
    const params = new HttpParams().set('competitionId', competitionId);

    return this.http.get<CompetitorDto[]>(`${API_BASE_URL}/competitors`, { params });
  }
}
