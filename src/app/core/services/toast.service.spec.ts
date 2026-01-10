import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ToastService', () => {
  let service: ToastService;
  let snackBarSpy: any;

  beforeEach(() => {
    snackBarSpy = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    });
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show success toast', () => {
    service.success('Operation successful');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Operation successful',
      'Fermer',
      expect.objectContaining({
        panelClass: ['toast-success'],
        duration: 3000,
      })
    );
  });

  it('should show error toast', () => {
    service.error('Operation failed');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Operation failed',
      'Fermer',
      expect.objectContaining({
        panelClass: ['toast-error'],
        duration: 5000,
      })
    );
  });

  it('should show info toast', () => {
    service.info('Just info');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Just info',
      'Fermer',
      expect.objectContaining({
        panelClass: ['toast-info'],
        duration: 3000,
      })
    );
  });

  it('should allow custom action label', () => {
    service.success('Custom action', 'Undo');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Custom action',
      'Undo',
      expect.any(Object)
    );
  });
});
