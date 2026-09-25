// ---------------------------------------------------------------------------
// sampleData.js  --  DUMMY data for Steps 3 and 4 of the plan.
//
// While the Backend Team is still building Firebase, we use this file so the
// website already looks and behaves like the finished product.
// In Step 6 you simply stop importing from here and start using
// src/services/api.js  ->  which the Backend Team fills with Firebase code.
// ---------------------------------------------------------------------------

export const sampleReports = [
  {
    id: 'r-1001',
    title: 'Broken Road',
    type: 'Complaint',
    description:
      'Large pothole near the college main gate. Two-wheelers are slowing down suddenly and it becomes dangerous after rain.',
    lat: 17.3871,
    lng: 78.4891,
    locationName: 'College Main Gate, Gachibowli',
    photoUrl: '',
    status: 'Unverified',
    reportedBy: 'Sai Teja',
    reportedAt: '2026-09-12T10:30:00+05:30',
  },
  {
    id: 'r-1002',
    title: 'Water Pipeline Leakage',
    type: 'Complaint',
    description:
      'Water has been leaking from the pipeline on the corner of the street for three days. Huge wastage and the road is slippery.',
    lat: 17.4021,
    lng: 78.4702,
    locationName: 'Street 4, Madhapur',
    photoUrl: '',
    status: 'In Progress',
    reportedBy: 'Anitha R',
    reportedAt: '2026-09-11T08:05:00+05:30',
  },
  {
    id: 'r-1003',
    title: 'Bike Accident at Signal',
    type: 'Incident',
    description:
      'Minor accident at the junction during morning rush hour. Ambulance was called and traffic police have arrived.',
    lat: 17.3735,
    lng: 78.5091,
    locationName: 'Kothapet Cross Roads',
    photoUrl: '',
    status: 'Resolved',
    reportedBy: 'Anonymous',
    reportedAt: '2026-09-10T09:15:00+05:30',
  },
  {
    id: 'r-1004',
    title: 'Blood Donation Camp',
    type: 'Event',
    description:
      'NSS unit is organising a blood donation camp. All students above 18 can participate. Certificates will be given.',
    lat: 17.3966,
    lng: 78.4512,
    locationName: 'College Auditorium',
    photoUrl: '',
    status: 'Verified',
    reportedBy: 'NSS Coordinator',
    reportedAt: '2026-09-09T17:40:00+05:30',
  },
  {
    id: 'r-1005',
    title: 'Planned Power Cut 10am - 2pm',
    type: 'Announcement',
    description:
      'Electricity board will take up maintenance work. Please plan your charging and lab work accordingly.',
    lat: 17.4152,
    lng: 78.5045,
    locationName: 'Hostel Block, Kukatpally',
    photoUrl: '',
    status: 'Verified',
    reportedBy: 'Hostel Warden',
    reportedAt: '2026-09-08T19:10:00+05:30',
  },
  {
    id: 'r-1006',
    title: 'Stray Dog Menace Near Canteen',
    type: 'Other',
    description:
      'A group of stray dogs near the back gate in the evening. Requesting the municipal team to take a look.',
    lat: 17.3612,
    lng: 78.4398,
    locationName: 'Back Gate, Mehdipatnam',
    photoUrl: '',
    status: 'Unverified',
    reportedBy: 'Rahul K',
    reportedAt: '2026-09-07T18:20:00+05:30',
  },
  {
    id: 'r-1007',
    title: 'Tree Fallen After Rain',
    type: 'Incident',
    description:
      'A big tree fell across the footpath and is blocking pedestrians. No one was hurt.',
    lat: 17.4288,
    lng: 78.4489,
    locationName: 'Park Road, Banjara Hills',
    photoUrl: '',
    status: 'In Progress',
    reportedBy: 'Anonymous',
    reportedAt: '2026-09-06T07:45:00+05:30',
  },
  {
    id: 'r-1008',
    title: 'Street Lights Not Working',
    type: 'Complaint',
    description:
      'Four street lights on our road are off since last week. It is completely dark after 8pm.',
    lat: 17.3846,
    lng: 78.4218,
    locationName: 'Road No. 3, Tolichowki',
    photoUrl: '',
    status: 'Resolved',
    reportedBy: 'Fatima S',
    reportedAt: '2026-09-05T20:15:00+05:30',
  },
]

export const sampleNews = [
  {
    id: 'n-01',
    title: 'Semester Exams Timetable Released',
    description:
      'The examination branch published the final timetable for all branches. Check the notice board or the college portal for the PDF.',
    date: '2026-09-13',
    category: 'Academics',
    author: 'Examination Branch',
  },
  {
    id: 'n-02',
    title: 'Campus Wi-Fi Upgrade This Weekend',
    description:
      'New access points are being installed in the library and Block C. Expect short network interruptions on Saturday.',
    date: '2026-09-12',
    category: 'Campus',
    author: 'IT Support',
  },
  {
    id: 'n-03',
    title: 'Placement Drive: 12 Companies Confirmed',
    description:
      'The training and placement cell confirmed 12 companies for the September drive. Registration closes on 20 September.',
    date: '2026-09-10',
    category: 'Placements',
    author: 'TPO Office',
  },
  {
    id: 'n-04',
    title: 'Library Extended Hours During Exams',
    description:
      'The central library will remain open till 11pm from Monday. Carry your ID card for entry after 8pm.',
    date: '2026-09-08',
    category: 'Campus',
    author: 'Chief Librarian',
  },
  {
    id: 'n-05',
    title: 'Road Repair Work Approved Near Main Gate',
    description:
      'The municipal corporation approved the repair of the road outside the main gate after repeated student complaints.',
    date: '2026-09-06',
    category: 'Civic',
    author: 'Student Council',
  },
]

export const sampleEvents = [
  {
    id: 'e-01',
    name: 'TechFest 2026 - Project Expo',
    location: 'College Auditorium',
    date: '2026-09-27',
    time: '10:00 AM',
    description:
      'Show your mini projects to judges from industry. Teams of up to 4 members. Prizes for the top three projects.',
    category: 'Technical',
    status: 'Upcoming',
  },
  {
    id: 'e-02',
    name: 'Blood Donation Camp',
    location: 'NSS Room, Block B',
    date: '2026-09-20',
    time: '9:00 AM',
    description:
      'Organised by the NSS unit with the Red Cross Society. Donors must be above 18 and above 50 kg.',
    category: 'Social',
    status: 'Upcoming',
  },
  {
    id: 'e-03',
    name: 'Inter-College Cricket Tournament',
    location: 'College Ground',
    date: '2026-10-04',
    time: '7:30 AM',
    description:
      'Eight college teams are participating. Entry is free for students. Bring your ID card.',
    category: 'Sports',
    status: 'Upcoming',
  },
  {
    id: 'e-04',
    name: 'Culture Night - Rhythm 2026',
    location: 'Open Air Theatre',
    date: '2026-08-29',
    time: '6:00 PM',
    description:
      'Music, dance and drama performances by every department. Thanks to everyone who attended and made it a success.',
    category: 'Cultural',
    status: 'Past',
  },
  {
    id: 'e-05',
    name: 'Clean Campus Drive',
    location: 'Main Campus',
    date: '2026-08-22',
    time: '8:00 AM',
    description:
      'Volunteers collected 40 bags of plastic waste. The drive will be repeated every month.',
    category: 'Social',
    status: 'Past',
  },
]
