/**
 * Seed the "Employment Reference" template matching the specific PDF requirements.
 */
function seedEmploymentTemplate() {
  const definition = {
    id: "employment-reference-v1",
    name: "Employment Reference (Standard)",
    sections: [
      {
        id: "reference_details",
        title: "Section 1: Reference Details",
        description: "Please confirm the details of the reference.",
        fields: [
            // Note: Candidate Name etc are usually header fields, but PDF asks for them in Section 1.
            // In our system, CandidateName etc are stored in the Request object, not the JSON responses.
            // But we can add fields here to let the referee confirm them if needed, or we just rely on the PDF header.
            // The PDF shows "Candidate Name", "Company Name" (Agency?), "Referee Name", "Position", "Email", "Tel".
            // We will add them as read-only or pre-filled if possible, or just standard fields.
            // For now, these are standard fields the referee fills/confirms.
          { id: "refereeName_confirm", label: "Referee Name", type: "text", required: true, layout: "half" },
          { id: "refereePosition_confirm", label: "Referee Position", type: "text", required: true, layout: "half" },
          { id: "refereeEmail_confirm", label: "Referee Email", type: "text", required: true, layout: "half" },
          { id: "refereeTel_confirm", label: "Referee Telephone", type: "text", required: true, layout: "half" },
          { id: "companyName_confirm", label: "Company Name", type: "text", required: true, layout: "full" }
        ]
      },
      {
        id: "employment_details",
        title: "Section 2: Employment Details",
        description: "",
        fields: [
          { id: "dateFrom", label: "Date Worked From", type: "date", required: true, layout: "half" },
          { id: "dateTo", label: "Date Worked To", type: "date", required: true, layout: "half" },
          { id: "jobTitle", label: "Candidate Job Title", type: "text", required: true, layout: "full" },
          { id: "reasonLeaving", label: "Reason for Leaving", type: "textarea", required: true, layout: "full" },
          { id: "safeguardingConcerns", label: "Any Safeguarding Concerns?", type: "textarea", required: false, layout: "full" } 
          // Note: PDF just says "Any Safeguarding Concerns". A textarea implies they can write "None" or details.
        ]
      },
      {
        id: "attributes",
        title: "Section 3: Attributes & Ratings",
        description: "Please rate the candidate on the following attributes:",
        fields: [
            // "Suitable for Role" is listed as a line item in PDF attributes
          { id: "suitableForRole", label: "Suitable for Role", type: "rating", required: true, layout: "half" },
          { id: "punctuality", label: "Punctuality / Attendance", type: "rating", required: true, layout: "half" },
          { id: "attitude", label: "Attitude", type: "rating", required: true, layout: "half" },
          { id: "reliability", label: "Reliability", type: "rating", required: true, layout: "half" },
          { id: "honesty", label: "Honesty", type: "rating", required: true, layout: "half" },
          { id: "initiative", label: "Initiative", type: "rating", required: true, layout: "half" },
          { id: "communication", label: "Communication Skills", type: "rating", required: true, layout: "half" },
          { id: "furtherInfo", label: "Further Information", type: "textarea", required: false, layout: "full" }
        ]
      },
      {
         id: "professional_qa",
         title: "Section 4: Professional Q&A",
         description: "",
         fields: [
            { 
               id: "disciplinaryAction", 
               label: "Has any disciplinary action been taken against the Candidate either on the grounds of performance or conduct?", 
               type: "boolean", 
               required: true, 
               layout: "full" 
            },
            {
               id: "reservations",
               label: "Have you any reservations about recommending the Candidate for work in a Social Care/Healthcare setting?",
               type: "boolean",
               required: true,
               layout: "full"
            },
            {
               id: "reasonNotToEngage",
               label: "Do you know of any reason why this Candidate should not be engaged/employed to work with Children, Vulnerable Adults or in the Social Care/Healthcare profession?",
               type: "boolean",
               required: true,
               layout: "full"
            },
            {
               id: "childrensAct",
               label: "If applicable, please describe the Candidate’s working knowledge of the Children’s Act or Community Care Act:",
               type: "textarea",
               required: false,
               layout: "full"
            }
         ]
      },
      {
         id: "consent_section",
         title: "Section 5: Consent to Share Reference",
         description: "In some instances, we may be requested to disclose references onto the 3rd party providing the above-named with work. Please indicate below to give your consent or otherwise. Failure to confirm will be taken that consent has been given.",
         fields: [
            {
               id: "consentShare",
               label: "I consent to you passing this information onto a 3rd party",
               type: "boolean",
               required: true,
               layout: "full"
            }
         ]
      },
      {
         id: "declaration",
         title: "Declaration",
         description: "",
         fields: [
            // The PDF has a specific declaration text: "I confirm that I am authorised strictly..."
            // We can put that in description or as a label?
            // Actually the standard declaration fields are Name, Position, Company, Verify Email
            // We'll keep the standard ID approach but the PDF generation will layout them specifically.
            { id: "refereeName", label: "Name", type: "text", required: true },
            { id: "refereePosition", label: "Position", type: "text", required: true },
            { id: "refereeCompany", label: "Company", type: "text", required: true },
            { id: "refereeTelephone", label: "Tel", type: "text", required: true },
            { id: "refereeEmailConfirm", label: "Sent from (Email)", type: "email", required: true },
            { id: "signature", label: "Signature", type: "signature", required: true }
         ]
      }
    ]
  };
  
  // Save to sheet directly (Bypass RBAC for Seeding)
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName("Template_Definitions");
  const data = sheet.getDataRange().getValues();
  const timestamp = new Date();
  const flatJson = JSON.stringify(definition.sections); // We save sections directly? 
  // Wait, frontend expects FLAT fields. 
  // initializeDatabase flattens them. 
  // Let's flatten them here to match the frontend expectation.
  let flatFields = [];
  if (definition.sections) {
    definition.sections.forEach(section => {
        if (section.fields) {
            flatFields = flatFields.concat(section.fields);
        }
    });
  }
  const structureStr = JSON.stringify(flatFields);

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === definition.id) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, 2).setValue(definition.name);
      sheet.getRange(rowIndex, 3).setValue(structureStr);
      sheet.getRange(rowIndex, 4).setValue('system_seed');
      sheet.getRange(rowIndex, 5).setValue(timestamp);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([definition.id, definition.name, structureStr, 'system_seed', timestamp]);
  }
  
  console.log("Seeded Employment Template V1");
  return { success: true, message: "Template seeded successfully" };
}
