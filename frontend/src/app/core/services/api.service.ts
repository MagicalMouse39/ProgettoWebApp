import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Horse } from '../models/horse.model';
import { HorseEvent, EventType } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // --- HORSES ---
  getHorses(): Observable<Horse[]> {
    return this.http.get<Horse[]>(`${this.baseUrl}/horses?order=name.asc`);
  }

  getHorse(id: string): Observable<Horse> {
    return this.http.get<Horse>(`${this.baseUrl}/horses?id=eq.${id}`, {
      headers: { 'Accept': 'application/vnd.pgrst.object+json' }
    });
  }

  createHorse(horse: Partial<Horse>): Observable<Horse> {
    return this.http.post<Horse>(`${this.baseUrl}/horses`, horse, {
      headers: { 'Prefer': 'return=representation' }
    });
  }

  updateHorse(id: string, horse: Partial<Horse>): Observable<Horse> {
    return this.http.patch<Horse>(`${this.baseUrl}/horses?id=eq.${id}`, horse, {
      headers: { 'Prefer': 'return=representation' }
    });
  }

  deleteHorse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/horses?id=eq.${id}`);
  }

  // --- EVENT TYPES ---
  getEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(`${this.baseUrl}/event_types`);
  }

  // --- EVENTS ---
  getEventsWithDetails(): Observable<HorseEvent[]> {
    const select = '*,horses(name),event_type:type_id(*)';
    return this.http.get<HorseEvent[]>(`${this.baseUrl}/events?select=${select}&order=scheduled_date.asc`);
  }

  getEvent(id: string): Observable<HorseEvent> {
    const select = '*,horses(name),event_type:type_id(*)';
    return this.http.get<HorseEvent>(`${this.baseUrl}/events?id=eq.${id}&select=${select}`, {
      headers: { 'Accept': 'application/vnd.pgrst.object+json' }
    });
  }

  createEvent(event: Partial<HorseEvent>): Observable<HorseEvent[]> {
    return this.http.post<HorseEvent[]>(`${this.baseUrl}/events`, event, {
      headers: { 'Prefer': 'return=representation' }
    });
  }

  updateEvent(id: string, event: Partial<HorseEvent>): Observable<HorseEvent[]> {
    return this.http.patch<HorseEvent[]>(`${this.baseUrl}/events?id=eq.${id}`, event, {
      headers: { 'Prefer': 'return=representation' }
    });
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events?id=eq.${id}`);
  }
}
