import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ReasonDialogComponent,
  ReasonDialogData,
} from "./reason-dialog.component";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

describe("ReasonDialogComponent", () => {
  let component: ReasonDialogComponent;
  let fixture: ComponentFixture<ReasonDialogComponent>;

  const mockData: ReasonDialogData = {
    title: "Test Title",
    message: "Test Message",
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReasonDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReasonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit s'initialiser avec une raison vide", () => {
    expect(component.reason).toBe("");
  });
});
