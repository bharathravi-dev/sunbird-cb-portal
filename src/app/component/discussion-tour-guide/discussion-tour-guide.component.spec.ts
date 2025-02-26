import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionTourGuideComponent } from './discussion-tour-guide.component';

describe('DiscussionTourGuideComponent', () => {
  let component: DiscussionTourGuideComponent;
  let fixture: ComponentFixture<DiscussionTourGuideComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DiscussionTourGuideComponent]
    });
    fixture = TestBed.createComponent(DiscussionTourGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
