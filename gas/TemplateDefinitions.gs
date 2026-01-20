
/**
 * Returns the canonical definition for "C&F - DFE Guidelines"
 * Based on Reference Request Children & Families 2024 (DFE Guidelines)
 */
function getCfDfeTemplate() {
  const COMPETENCY_SCALE = ['Strong', 'Competent', 'Requires development', 'Unproven'];
  
  return {
    templateId: 'cf-dfe-guidelines',
    name: 'C&F - DFE Guidelines',
    sections: [
      {
        id: 'details',
        title: 'Details',
        fields: [
          {
            id: 'candidateName',
            type: 'text',
            label: 'Candidate Name',
            required: true,
            layout: 'full'
          },
          {
            id: 'consentToShare',
            type: 'boolean',
            label: 'I consent to you passing this information onto a 3rd party',
            description: 'In some instances, we may be requested to disclose references onto the 3rd party providing the above-named with work. Please indicate below to give your consent or otherwise. Failure to confirm will be taken that consent has been given.',
            required: true,
            layout: 'full'
          },
          {
            id: 'declarationAuth',
            type: 'boolean',
            label: 'Declaration: I confirm that I am authorised to give the above information on behalf of:',
            required: true,
            layout: 'full'
          },
          {
            id: 'declarationOrg',
            type: 'text',
            label: 'Organisation you are authorised to represent',
            required: true,
            layout: 'full',
            conditional: {
              field: 'declarationAuth',
              value: true
            }
          }
        ]
      },
      {
        id: 'refereeDetails',
        title: 'Referee details',
        fields: [
          { id: 'refereeName', type: 'text', label: 'Name', required: true, layout: 'half' },
          { id: 'refereeJobTitle', type: 'text', label: 'Job title', required: true, layout: 'half' },
          { id: 'refereeAuthority', type: 'text', label: 'Local authority', required: true, layout: 'half' },
          { id: 'refereeEmail', type: 'email', label: 'Email', required: true, layout: 'half' },
          { id: 'refereePhone', type: 'text', label: 'Telephone Number', required: true, layout: 'half' }
        ]
      },
      {
        id: 'workerDetails',
        title: 'Worker details',
        fields: [
          // Name repeated? Prompt says "Name". Likely candidate name or worker name confirming?
          // Usually "Worker Name" (Candidate). 
          // I will use "workerName" ID.
          { id: 'workerName', type: 'text', label: 'Name', required: true, layout: 'half' },
          { id: 'sweRegistration', type: 'text', label: 'Social Work England registration number', required: true, layout: 'half' }
        ]
      },
      {
        id: 'assignmentDetail',
        title: 'Assignment detail',
        fields: [
          { id: 'assignmentStartDate', type: 'date', label: 'Start date', required: true, layout: 'half' },
          { id: 'assignmentEndDate', type: 'date', label: 'End date', required: true, layout: 'half' },
          { id: 'assignmentJobTitle', type: 'text', label: 'Job title', required: true, layout: 'half' },
          { id: 'reasonForLeaving', type: 'textarea', label: 'Reason for leaving', required: true, layout: 'full' },
          { id: 'safeguardingConcerns', type: 'textarea', label: 'Please detail any Safeguarding concerns', required: true, layout: 'full' }
        ]
      },
      {
        id: 'areaOfPractise',
        title: 'Area of practise',
        fields: [
          {
            id: 'practiseAreas',
            type: 'checkbox-group',
            label: 'Area of practise',
            required: true,
            options: ['CiN/CP', 'LAC', 'Fostering', 'Adoption', 'Other'],
            layout: 'full'
          },
          {
            id: 'practiseAreaOther',
            type: 'text',
            label: 'Other area details',
            required: true,
            layout: 'full',
            conditional: {
              field: 'practiseAreas',
              value: 'Other' // Code.gs/DynamicForm updated to check "includes" for array parents
            }
          }
        ]
      },
      {
        id: 'courtWork',
        title: 'Court work',
        fields: [
          { id: 'includedCourtWork', type: 'boolean', label: 'Did the assignment include court work?', required: true, layout: 'full' }
        ]
      },
      {
        id: 'competencyAssessment',
        title: 'Competency assessment (DFE)',
        description: 'Strong: very experienced, consistently high performance\nCompetent: meets all basic expectations, consistently effective performance\nRequires development: inconsistent or not fully effective, may relate to competency or behaviour',
        fields: [
           // Knowledge
           { id: 'compKnowledge', type: 'rating', label: 'Knowledge and understanding of child protection policies, procedures, and legislation', required: true, options: COMPETENCY_SCALE, layout: 'full' },
           { id: 'compRecords', type: 'rating', label: 'Maintenance of accurate and up-to-date records and documentation', required: true, options: COMPETENCY_SCALE, layout: 'full' },
           { id: 'compReports', type: 'rating', label: 'Writing clear, concise, and comprehensive reports, assessments, and plans', required: true, options: COMPETENCY_SCALE, layout: 'full' },
           
           // Assessment
           { id: 'compAssessment', type: 'rating', label: 'Ability to assess needs, strengths, and risks to ensure safety and well-being and involvement of children and families in decision-making processes', required: true, options: COMPETENCY_SCALE, layout: 'full' },
           { id: 'compPlanning', type: 'rating', label: 'Development and implementation of effective plans utilising evidence-based approaches', required: true, options: COMPETENCY_SCALE, layout: 'full' },
           { id: 'compPrioritisation', type: 'rating', label: 'Ability to prioritise tasks and manage competing demands while maintaining a focus on the best interests of the child', required: true, options: COMPETENCY_SCALE, layout: 'full' },
           
           // Working effectively
           { id: 'compCollaboration', type: 'rating', label: 'Ability to work collaboratively with multidisciplinary teams and partner agencies', required: true, options: COMPETENCY_SCALE, layout: 'full' }
        ]
      },
      {
        id: 'candidateRating',
        title: 'Candidate rating',
        fields: [
          { id: 'ratingPunctuality', type: 'rating', label: 'Punctuality/Attendance', required: true, layout: 'half' },
          { id: 'ratingAttitudeStaff', type: 'rating', label: 'Attitude to staff/Clients (if applicable)', required: true, layout: 'half' },
          { id: 'ratingAttitude', type: 'rating', label: 'Attitude', required: true, layout: 'half' },
          { id: 'ratingReliability', type: 'rating', label: 'Reliability', required: true, layout: 'half' },
          { id: 'ratingHonesty', type: 'rating', label: 'Honesty', required: true, layout: 'half' },
          { id: 'ratingInitiative', type: 'rating', label: 'Initiative', required: true, layout: 'half' },
          { id: 'ratingCommunication', type: 'rating', label: 'Communication Skills', required: true, layout: 'full' }
        ]
      },
      {
        id: 'furtherInfo',
        title: 'Further information',
        fields: [
          { id: 'furtherInformation', type: 'textarea', label: 'Please give further information', required: false, layout: 'full' }
        ]
      },
      {
        id: 'declaration',
        title: 'Declaration',
        fields: [
          { id: 'declName', type: 'text', label: 'Name', required: true, layout: 'half' },
          { id: 'declPosition', type: 'text', label: 'Position', required: true, layout: 'half' },
          { id: 'declPhone', type: 'text', label: 'Telephone Number', required: true, layout: 'half' },
          { id: 'declDate', type: 'date', label: 'Date', required: true, layout: 'half' },
          { id: 'signature', type: 'signature', label: 'Digital Signature', required: true, layout: 'full' }
        ]
      }
    ]
  };
}

/**
 * Returns the canonical definition for "Evaluation Form"
 * Based on Semester Recruitment – Candidate Evaluation Form
 */
function getEvaluationFormTemplate() {
  const RATING_SCALE = ["Excellent", "Very Good", "Good", "Satisfactory", "Poor"];
  
  return {
    templateId: 'evaluation-form',
    name: 'Evaluation Form',
    sections: [
      {
        id: 'candidateDetails',
        title: 'Candidate Details',
        fields: [
          { id: 'candidateName', type: 'text', label: 'Candidate Name', required: true, layout: 'full' },
          { id: 'jobTitle', type: 'text', label: 'Job Title of Candidate', required: true, layout: 'full' },
          { id: 'startDate', type: 'date', label: 'Employment / Shift Start Date', required: true, layout: 'half' },
          { id: 'endDate', type: 'date', label: 'Employment / Shift End Date', required: true, layout: 'half' }
        ]
      },
      {
        id: 'performanceEvaluation',
        title: 'Performance Evaluation',
        fields: [
          // Attendance
          { id: 'ratingAttendance', type: 'rating', label: 'Attendance', required: true, options: RATING_SCALE, layout: 'full' },
          { id: 'commentAttendance', type: 'textarea', label: 'Further Comment', required: false, layout: 'full' },
          
          // Punctuality
          { id: 'ratingPunctuality', type: 'rating', label: 'Punctuality', required: true, options: RATING_SCALE, layout: 'full' },
          { id: 'commentPunctuality', type: 'textarea', label: 'Further Comment', required: false, layout: 'full' },
          
          // Ability to relate to clients
          { id: 'ratingClients', type: 'rating', label: 'Ability to relate to clients', required: true, options: RATING_SCALE, layout: 'full' },
          { id: 'commentClients', type: 'textarea', label: 'Further Comment', required: false, layout: 'full' },
          
          // Ability to work as part of a team
          { id: 'ratingTeam', type: 'rating', label: 'Ability to work as part of a team', required: true, options: RATING_SCALE, layout: 'full' },
          { id: 'commentTeam', type: 'textarea', label: 'Further Comment', required: false, layout: 'full' },
          
          // Ability / Standard of work
          { id: 'ratingWork', type: 'rating', label: 'Ability / Standard of work', required: true, options: RATING_SCALE, layout: 'full' },
          { id: 'commentWork', type: 'textarea', label: 'Further Comment', required: false, layout: 'full' },
          
          // Ability to relate to colleagues
          { id: 'ratingColleagues', type: 'rating', label: 'Ability to relate to colleagues', required: true, options: RATING_SCALE, layout: 'full' },
          { id: 'commentColleagues', type: 'textarea', label: 'Further Comment', required: false, layout: 'full' }
        ]
      },
      {
        id: 'suitabilitySafeguarding',
        title: 'Suitability & Safeguarding',
        fields: [
          { id: 'suitedToWork', type: 'boolean', label: 'In your opinion is this person suited to work in the social work / care field?', required: true, layout: 'full' },
          { id: 'safeguardingConcerns', type: 'boolean', label: 'Any Safeguarding Concerns?', required: true, layout: 'full' },
          { 
             id: 'safeguardingDetails', 
             type: 'textarea', 
             label: 'If yes, please provide details', 
             required: true, 
             layout: 'full',
             conditional: { field: 'safeguardingConcerns', value: true }
          },
          { id: 'generalComments', type: 'textarea', label: 'Any further general comments', required: false, layout: 'full' }
        ]
      },
      {
        id: 'organisationDeclaration',
        title: 'Organisation & Declaration',
        fields: [
          { id: 'organisationName', type: 'text', label: 'Name of Organisation', required: true, layout: 'full' },
          { id: 'declDate', type: 'date', label: 'Date', required: true, layout: 'half' },
          { id: 'declName', type: 'text', label: 'Name', required: true, layout: 'half' },
          { id: 'declPosition', type: 'text', label: 'Position / Title', required: true, layout: 'half' },
          { id: 'declEmail', type: 'email', label: 'Email', required: true, layout: 'half' },
          { id: 'declPhone', type: 'text', label: 'Telephone Number', required: true, layout: 'half' },
          { id: 'signature', type: 'signature', label: 'Digital Signature', required: true, layout: 'full' }
        ]
      },
      {
        id: 'consent',
        title: 'Consent',
        fields: [
          { id: 'consentThirdParty', type: 'boolean', label: 'Can this evaluation be shown to a 3rd party?', required: true, layout: 'full' },
          { id: 'consentCandidate', type: 'boolean', label: 'Can this evaluation be shown to the candidate?', required: true, layout: 'full' }
        ]
      }
    ]
  };
}
