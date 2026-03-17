import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { BehaviorSubject, Observable, map, switchMap } from 'rxjs';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  private refresh$ = new BehaviorSubject<void>(undefined);

  private baseOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'it',
    firstDay: 1,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    buttonText: {
      today: 'Oggi',
      month: 'Mese',
      week: 'Settimana'
    },
    events: [],
    eventClick: this.handleEventClick.bind(this),
    height: 'auto',
    dayMaxEvents: 2,
    handleWindowResize: true,
    expandRows: true,
    stickyHeaderDates: true,
  };

  calendarOptions$: Observable<CalendarOptions> = this.refresh$.pipe(
    switchMap(() => this.apiService.getEventsWithDetails()),
    map(events => {
      const calendarEvents: EventInput[] = events.map(e => ({
        id: e.id,
        title: `${e.horses?.name}: ${e.event_type?.name}`,
        start: e.scheduled_date,
        backgroundColor: e.event_type?.color_hex + '22',
        textColor: e.event_type?.color_hex,
        borderColor: 'transparent',
        extendedProps: { ...e }
      }));

      return {
        ...this.baseOptions,
        events: calendarEvents
      };
    })
  );

  ngOnInit() {
    this.refreshData();
  }

  loadEvents() {
    this.refreshData();
  }

  refreshData() {
    this.refresh$.next();
  }

  handleEventClick(arg: any) {
    const eventId = arg.event.id;
    this.router.navigate(['/events/edit', eventId]);
  }

  newEvent() {
    this.router.navigate(['/events/new']);
  }
}
