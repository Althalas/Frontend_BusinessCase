import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ReportDialogComponent,
  ReportDialogData,
} from "./report-dialog.component";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

describe("ReportDialogComponent", () => {
  let component: ReportDialogComponent;
  let fixture: ComponentFixture<ReportDialogComponent>;

  const mockData: ReportDialogData = {
    type: "station",
    targetId: 1,
    targetName: "Test Station",
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit avoir le formulaire initial invalide", () => {
    expect(component.reportForm.valid).toBeFalsy();
  });

  it("doit valider le formulaire quand une raison est sélectionnée", () => {
    component.reportForm.patchValue({ reason: "OTHER" });
    expect(component.reportForm.valid).toBeTruthy();
  });
});
