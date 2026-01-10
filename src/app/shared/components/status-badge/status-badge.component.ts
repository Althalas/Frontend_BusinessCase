import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Station, getStationStatus, getStationStatusLabel } from '@core/services/stations.service';

@Component({
    selector: 'app-status-badge',
  
    imports: [CommonModule],
    template: `
    <span class="status-badge" [ngClass]="badgeClass()">
      <span class="dot"></span>
      {{ label() }}
    </span>
  `,
    styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: currentColor;
    }

    .status-available {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-busy {
      background-color: #ffebee;
      color: #c62828;
    }

    .status-offline {
      background-color: #f5f5f5;
      color: #616161;
    }
  `]
})
export class StatusBadgeComponent {
    readonly station = input.required<Station>();

    readonly status = computed(() => getStationStatus(this.station()));
    readonly label = computed(() => getStationStatusLabel(this.station()));

    readonly badgeClass = computed(() => {
        const s = this.status();
        switch (s) {
            case 'AVAILABLE': return 'status-available';
            case 'BUSY': return 'status-busy';
            case 'OFFLINE': return 'status-offline';
            default: return 'status-offline';
        }
    });
}
