window.MGS_REFERENCE = {
  edition: 'NFPA 99-2024',
  audience: ['New to medical gas', 'ASSE 6010 Installer', 'ASSE 6020 Inspector', 'ASSE 6030 Verifier', 'ASSE 6035 Bulk Verifier'],
  source: {
    label: 'NFPA 99 public development material using the 2024 edition as baseline text',
    url: 'https://docinfofiles.nfpa.org/files/AboutTheCodes/99/99_A2026_HEA_PIP_PI_Report.pdf',
    note: 'Reference summaries are original MGS field explanations, not reproduced NFPA code text. Confirm requirements against the licensed edition adopted for the project and applicable AHJ requirements.'
  },
  components: [
    {
      id: 'source-valve',
      name: 'Source Valve',
      group: 'Valves',
      systems: ['Medical gases', 'Medical-surgical vacuum', 'WAGD where applicable'],
      nfpa: ['5.1.4.2'],
      summary: 'The isolation point at the connection between a central supply system and the facility distribution piping.',
      fieldFocus: 'Use this page to understand what the source valve isolates, where it sits in the system path, and which downstream alarms or valves relate to it.',
      roles: ['6010', '6020', '6030'],
      search: ['source valve', 'source shutoff', 'central supply isolation']
    },
    {
      id: 'main-line-valve',
      name: 'Main Line Valve',
      group: 'Valves',
      systems: ['Medical gases', 'Medical-surgical vacuum'],
      nfpa: ['5.1.4.3'],
      summary: 'A major isolation valve in the main distribution line serving the building.',
      fieldFocus: 'Shows the relationship between the source valve, building entry, main distribution piping, and downstream risers or branches.',
      roles: ['6010', '6020', '6030'],
      search: ['main line valve', 'main valve', 'building isolation']
    },
    {
      id: 'riser-valve',
      name: 'Riser Valve',
      group: 'Valves',
      systems: ['Medical gases', 'Medical-surgical vacuum'],
      nfpa: ['5.1.4.4'],
      summary: 'A shutoff serving an individual riser from the main distribution line.',
      fieldFocus: 'Use this page to understand riser isolation and how a vertical distribution path relates to the main and branch piping.',
      roles: ['6010', '6020', '6030'],
      search: ['riser valve', 'riser isolation', 'vertical piping']
    },
    {
      id: 'service-valve',
      name: 'Service Valve',
      group: 'Valves',
      systems: ['Medical gases', 'Medical-surgical vacuum'],
      nfpa: ['5.1.4.5'],
      summary: 'A branch isolation valve used so lateral piping can be serviced or modified without shutting down a larger portion of the system.',
      fieldFocus: 'Connect this component to branch piping, zone valve boxes, renovation work, and shutdown planning.',
      roles: ['6010', '6020', '6030'],
      search: ['service valve', 'branch valve', 'lateral isolation']
    },
    {
      id: 'zone-valve',
      name: 'Zone Valve',
      group: 'Valves',
      systems: ['Oxygen', 'Medical air', 'Nitrous oxide', 'Nitrogen', 'Carbon dioxide', 'Medical-surgical vacuum', 'WAGD where applicable'],
      nfpa: ['5.1.4.6', '5.1.8.2.2', '5.1.9.4.4'],
      summary: 'The patient-area isolation valve that separates a defined zone of outlets or inlets from the upstream distribution system.',
      fieldFocus: 'High-value field page: location concept, what the valve controls, patient/use-side pressure or vacuum indication, and its relationship to area alarm sensing.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['zone valve', 'zone valve box', 'patient side', 'area alarm sensor']
    },
    {
      id: 'master-alarm',
      name: 'Master Alarm',
      group: 'Alarms',
      systems: ['Medical gases', 'Medical-surgical vacuum', 'WAGD'],
      nfpa: ['5.1.9.2'],
      summary: 'Facility-level alarm monitoring for source, reserve, and main-line system conditions.',
      fieldFocus: 'Trace a signal from the source or main-line initiating device to required master alarm locations and distinguish a master alarm from area and local alarms.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['master alarm', 'source alarm', 'main line alarm', 'alarm panel']
    },
    {
      id: 'area-alarm',
      name: 'Area Alarm',
      group: 'Alarms',
      systems: ['Medical gases', 'Medical-surgical vacuum', 'Piped WAGD'],
      nfpa: ['5.1.9.4'],
      summary: 'Patient-area monitoring that indicates abnormal pressure or vacuum conditions in the piping serving the monitored space.',
      fieldFocus: 'Focus on what area the panel serves, where the sensor sits relative to the zone valve, and the distinction between general Category 1 spaces and anesthetizing locations.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['area alarm', 'nurse station', 'transducer', 'sensor', 'high pressure', 'low pressure']
    },
    {
      id: 'cylinder-manifold',
      name: 'Gas Cylinder Manifold',
      group: 'Sources',
      systems: ['Oxygen', 'Nitrous oxide', 'Nitrogen', 'Carbon dioxide', 'Other permitted cylinder gases'],
      nfpa: ['5.1.3.5.10'],
      summary: 'A central supply source using primary and secondary cylinder headers with pressure control, changeover, and source-status signaling.',
      fieldFocus: 'Teach source architecture: headers, changeover, regulators, reserve relationship, local status, master alarm relationship, and source isolation.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['manifold', 'cylinder bank', 'changeover', 'primary header', 'secondary header']
    },
    {
      id: 'medical-air-source',
      name: 'Medical Air Source',
      group: 'Sources',
      systems: ['Medical air'],
      nfpa: ['5.1.3.6'],
      summary: 'The central compressor-based source that produces, conditions, monitors, and supplies medical air to the distribution system.',
      fieldFocus: 'Teach the system path and component relationships without becoming a compressor-service or pipe-preparation tutorial.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['medical air', 'compressor', 'dryer', 'receiver', 'filter', 'dew point', 'carbon monoxide']
    },
    {
      id: 'vacuum-source',
      name: 'Medical-Surgical Vacuum Source',
      group: 'Sources',
      systems: ['Medical-surgical vacuum'],
      nfpa: ['5.1.3.7'],
      summary: 'The central vacuum source serving the medical-surgical vacuum distribution system.',
      fieldFocus: 'Teach pumps, receiver, controls, source isolation, exhaust, alarm relationships, and the path back to vacuum inlets.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['vacuum source', 'vacuum pump', 'receiver', 'vacuum exhaust']
    },
    {
      id: 'station-outlet',
      name: 'Medical Gas Station Outlet',
      group: 'Outlets & Inlets',
      systems: ['Oxygen', 'Medical air', 'Nitrous oxide', 'Nitrogen', 'Carbon dioxide', 'Instrument air'],
      nfpa: ['5.1.5'],
      summary: 'The gas-specific terminal point where a pressure medical gas is made available for connection to user equipment.',
      fieldFocus: 'Focus on service specificity, identification, physical location, system relationship, and verification rather than installation trade basics.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['outlet', 'oxygen outlet', 'medical air outlet', 'terminal', 'DISS', 'quick connect']
    },
    {
      id: 'station-inlet',
      name: 'Vacuum / WAGD Station Inlet',
      group: 'Outlets & Inlets',
      systems: ['Medical-surgical vacuum', 'WAGD'],
      nfpa: ['5.1.5'],
      summary: 'The gas-specific terminal point connecting user equipment to a vacuum or WAGD piping system.',
      fieldFocus: 'Focus on service identification, correct system connection, location, and verification.',
      roles: ['New', '6010', '6020', '6030'],
      search: ['vacuum inlet', 'WAGD inlet', 'suction terminal', 'terminal']
    }
  ]
};
