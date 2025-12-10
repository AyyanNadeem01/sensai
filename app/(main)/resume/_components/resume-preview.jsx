"use client";

import { useMemo } from "react";

export function ResumePreview({ content, user }) {
  const parsedContent = useMemo(() => {
    if (!content) return [];

    const sections = [];
    const lines = content.split("\n");
    let currentSection = null;
    let currentContent = [];

    lines.forEach((line) => {
      if (line.startsWith("## ")) {
        if (currentSection) {
          sections.push({
            title: currentSection,
            content: currentContent.join("\n").trim(),
          });
        }
        currentSection = line.replace("## ", "").trim();
        currentContent = [];
      } else if (line.startsWith("### ")) {
        currentContent.push(line);
      } else if (line.trim()) {
        currentContent.push(line);
      }
    });

    if (currentSection) {
      sections.push({
        title: currentSection,
        content: currentContent.join("\n").trim(),
      });
    }

    return sections;
  }, [content]);

  if (!parsedContent || parsedContent.length === 0) {
    return (
      <div className="w-full min-h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Resume Content</h3>
          <p className="text-gray-600 max-w-md">
            Start building your professional resume by adding content in the Edit tab above.
          </p>
        </div>
      </div>
    );
  }

  const headerSection = parsedContent.find(section => 
    !section.title.match(/professional summary|skills|work experience|education|projects/i)
  );

  const summarySection = parsedContent.find(section => 
    section.title.match(/professional summary|summary/i)
  );

  const skillsSection = parsedContent.find(section => 
    section.title.match(/skills/i)
  );

  const experienceSection = parsedContent.find(section => 
    section.title.match(/work experience|experience/i)
  );

  const educationSection = parsedContent.find(section => 
    section.title.match(/education/i)
  );

  const projectsSection = parsedContent.find(section => 
    section.title.match(/projects/i)
  );

  const contactInfo = headerSection?.content 
    ? headerSection.content.split("|").map(item => item.trim())
    : [];

  // Helper function to render bullet points
  const renderBulletPoints = (text) => {
    return text.split('\n').map((line, idx) => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <li key={idx} className="flex items-start mb-1">
            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span className="text-gray-700">{line.trim().substring(1).trim()}</span>
          </li>
        );
      }
      return <p key={idx} className="mb-2 text-gray-700">{line}</p>;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 md:p-12 font-serif shadow-xl rounded-lg border border-gray-200">
      {/* Professional Header */}
      <div className="text-center mb-10 pb-8 border-b border-gray-300">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          {user?.fullName || "Your Name"}
        </h1>
        
        {contactInfo.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-sm md:text-base text-gray-700 mt-4">
            {contactInfo.map((info, index) => {
              const cleanInfo = info
                .replace(/📧/g, "")
                .replace(/📱/g, "")
                .replace(/💼/g, "")
                .replace(/🐦/g, "")
                .replace(/\[(.*?)\]\((.*?)\)/g, "$2")
                .trim();
              
              const icon = info.includes('@') ? '✉️' : 
                          info.includes('linkedin') ? '🔗' : 
                          info.includes('twitter') ? '🐦' : '📱';
              
              return (
                <div key={index} className="flex items-center bg-gray-50 px-4 py-2 rounded-full">
                  <span className="mr-2">{icon}</span>
                  <span className="font-medium">{cleanInfo}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Section */}
      {summarySection && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-blue-600">
            {summarySection.title}
          </h2>
          <div className="text-gray-700 leading-relaxed text-justify text-lg">
            {renderBulletPoints(summarySection.content)}
          </div>
        </div>
      )}

      {/* Skills Section */}
      {skillsSection && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-blue-600">
            {skillsSection.title}
          </h2>
          <div className="flex flex-wrap gap-3">
            {skillsSection.content.split('\n').flatMap((skillLine) =>
              skillLine.split(/[,•\-]/)
                .filter(skill => skill.trim())
                .map((skill, idx) => (
                  <span 
                    key={idx} 
                    className="inline-block bg-blue-50 text-blue-800 px-4 py-2 rounded-md font-medium text-sm border border-blue-100"
                  >
                    {skill.trim()}
                  </span>
                ))
            )}
          </div>
        </div>
      )}

      {/* Work Experience Section */}
      {experienceSection && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-blue-600">
            {experienceSection.title}
          </h2>
          <div className="space-y-8">
            {experienceSection.content.split("\n\n").map((entry, idx) => {
              const lines = entry.split("\n").filter(line => line.trim());
              const titleLine = lines[0]?.replace("### ", "") || "";
              
              return (
                <div key={idx} className="relative pl-6 border-l-2 border-blue-200">
                  <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-600 rounded-full"></div>
                  <div className="mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{titleLine}</h3>
                    {lines.slice(1).find(line => line.includes('|') || line.includes('at')) && (
                      <div className="text-gray-600 text-sm italic mb-3">
                        {lines.slice(1).find(line => line.includes('|') || line.includes('at'))}
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-2 mt-3">
                    {lines.slice(1)
                      .filter(line => !line.includes('|') && !line.includes('at'))
                      .map((line, lineIdx) => (
                        <li key={lineIdx} className="flex items-start">
                          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700">{line.trim().replace(/^[•\-]\s*/, '')}</span>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Education Section */}
      {educationSection && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-blue-600">
            {educationSection.title}
          </h2>
          <div className="space-y-6">
            {educationSection.content.split("\n\n").map((entry, idx) => {
              const lines = entry.split("\n").filter(line => line.trim());
              const titleLine = lines[0]?.replace("### ", "") || "";
              
              return (
                <div key={idx} className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{titleLine}</h3>
                  {lines.slice(1).map((line, lineIdx) => (
                    <div 
                      key={lineIdx} 
                      className={`${line.includes('|') || line.includes('-') ? 'text-gray-600 text-sm' : 'text-gray-700'}`}
                    >
                      {line.trim()}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {projectsSection && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b-2 border-blue-600">
            {projectsSection.title}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {projectsSection.content.split("\n\n").map((entry, idx) => {
              const lines = entry.split("\n").filter(line => line.trim());
              const titleLine = lines[0]?.replace("### ", "") || "";
              
              return (
                <div key={idx} className="border border-gray-300 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{titleLine}</h3>
                  <div className="space-y-2">
                    {lines.slice(1).map((line, lineIdx) => (
                      <div 
                        key={lineIdx} 
                        className={`${line.includes('|') || line.includes('-') ? 'text-gray-600 text-sm' : 'text-gray-700 text-sm'}`}
                      >
                        {line.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}