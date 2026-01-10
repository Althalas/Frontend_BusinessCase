import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingsListComponent } from './bookings-list.component';
import { provideRouter } from '@angular/router';
import { BookingsService } from '@core/services/bookings.service';
import { ToastService } from '@core/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

// Mock mutation utility synchronously
vi.mock('@shared/utils/mutation.util', () => ({
  createMutationResource: (mutationFn: any) => {
    return {
      mutate: (args: any) => {
         try {
             const result = mutationFn(args);
             if (result && typeof result.subscribe === 'function') {
                result.subscribe();
             }
         } catch(e) {}
      },
      isLoading: signal(false),
      isSuccess: signal(false),
      isError: signal(false),
      value: signal(undefined),
      status: signal('idle'),
      error: signal(undefined),
      reset: vi.fn()
    };
  }
}));

// Mock pagination utility
vi.mock('@shared/utils/pagination.util', () => ({
  createPaginatedResource: (fetchFn: any) => {
    return {
      data: signal([]), // Return empty array by default
      total: signal(0),
      loading: signal(false),
      error: signal(undefined),
    };
  }
}));


describe('BookingsListComponent', () => {
  let component: BookingsListComponent;
  let fixture: ComponentFixture<BookingsListComponent>;
  let bookingsServiceSpy: any;
  let toastServiceSpy: any;
  let dialogSpy: any;

  beforeEach(async () => {
    bookingsServiceSpy = {
      getMyBookings: vi.fn(), // pagination utility calls this
      cancel: vi.fn().mockReturnValue(of({ status: 'cancelled' })),
      downloadReceipt: vi.fn().mockReturnValue(of(new Blob())),
      exportBookings: vi.fn().mockReturnValue(of(new Blob())),
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };
    dialogSpy = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true) // Confirmed
      })
    };

    await TestBed.configureTestingModule({
      imports: [BookingsListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BookingsService, useValue: bookingsServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        // Use override to ensure component providers are replaced if necessary
      ],
    })
    .overrideProvider(MatDialog, { useValue: dialogSpy }) // Force override
    .compileComponents();

    fixture = TestBed.createComponent(BookingsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should cancel booking when confirmed', () => {
    component.cancelBooking(123);
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(bookingsServiceSpy.cancel).toHaveBeenCalledWith(123);
  });

  it('should download receipt', () => {
    component.downloadReceipt(456);
    expect(bookingsServiceSpy.downloadReceipt).toHaveBeenCalledWith(456);
  });
  
  it('should export excel', () => {
    component.exportExcel();
    expect(bookingsServiceSpy.exportBookings).toHaveBeenCalled();
  });
});
