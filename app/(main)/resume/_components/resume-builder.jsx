"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { jsPDF } from "jspdf";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import { ResumePreview } from "./resume-preview";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent || "");
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {
        email: "",
        mobile: "",
        linkedin: "",
        twitter: "",
      },
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  // Initialize form with initial content if provided
  useEffect(() => {
    if (initialContent) {
      setPreviewContent(initialContent);
      setActiveTab("preview");
    }
  }, [initialContent]);

  // Watch form fields for preview updates
  const formValues = watch();

  // Update preview content when form values change
  useEffect(() => {
    if (activeTab === "edit" && isDirty) {
      const newContent = getCombinedContent();
      if (newContent && newContent !== previewContent) {
        setPreviewContent(newContent);
      }
    }
  }, [formValues, activeTab, isDirty]);

  // Handle save result
  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo?.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo?.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo?.linkedin)
      parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo?.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return parts.length > 0
      ? `## ${user?.fullName || "Your Name"}\n\n${parts.join(" | ")}`
      : `## ${user?.fullName || "Your Name"}`;
  };

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const [isGenerating, setIsGenerating] = useState(false);

const generatePDF = () => {
  setIsGenerating(true);
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Set margins and colors
    const margin = 25;
    let yPosition = margin;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - 2 * margin;

    // Professional font colors and styles
    const primaryColor = [41, 128, 185]; // Blue
    const secondaryColor = [52, 73, 94]; // Dark gray
    const accentColor = [231, 76, 60]; // Red

    // Helper function for section headers
    const addSectionHeader = (title) => {
      doc.setFontSize(16);
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      
      const lines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
      if (yPosition + (lines.length * 6) > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 6 + 2;
      
      // Add underline
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    };

    // Helper function for body text
    const addBodyText = (text, fontSize = 11, isBold = false, spacing = 5) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(...secondaryColor);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      
      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = fontSize * 0.35;
      
      if (yPosition + (lines.length * lineHeight) > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * lineHeight + spacing;
    };

    // Helper function for bullet points
    const addBulletList = (items, indent = 5) => {
      items.forEach((item, index) => {
        const bulletText = `• ${item}`;
        doc.setFontSize(11);
        doc.setTextColor(...secondaryColor);
        
        const lines = doc.splitTextToSize(bulletText, contentWidth - indent);
        const lineHeight = 11 * 0.35;
        
        if (yPosition + (lines.length * lineHeight) > doc.internal.pageSize.height - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(lines, margin + indent, yPosition);
        yPosition += lines.length * lineHeight + 2;
      });
      yPosition += 3;
    };

    // Header with name
    doc.setFontSize(28);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(user?.fullName || "Your Name", margin, yPosition);
    yPosition += 12;

    // Contact info
    const { contactInfo } = formValues;
    const contactLines = [];
    if (contactInfo?.email) contactLines.push(`Email: ${contactInfo.email}`);
    if (contactInfo?.mobile) contactLines.push(`Phone: ${contactInfo.mobile}`);
    if (contactInfo?.linkedin) contactLines.push(`LinkedIn: ${contactInfo.linkedin}`);
    if (contactInfo?.twitter) contactLines.push(`Twitter: ${contactInfo.twitter}`);
    
    if (contactLines.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(contactLines.join(" | "), margin, yPosition);
      yPosition += 15;
    }

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 12;

    // Professional Summary
    if (formValues.summary) {
      addSectionHeader("Professional Summary");
      addBodyText(formValues.summary, 11, false, 8);
    }

    // Skills
    if (formValues.skills) {
      addSectionHeader("Skills");
      const skillsArray = formValues.skills.split('\n').filter(s => s.trim());
      const skillsText = skillsArray.map(skill => skill.trim()).join(' • ');
      addBodyText(skillsText, 11, false, 8);
    }

    // Work Experience
    if (formValues.experience && formValues.experience.length > 0) {
      addSectionHeader("Work Experience");
      formValues.experience.forEach((exp, index) => {
        // Job title and company
        let titleText = '';
        if (exp.position && exp.company) {
          titleText = `${exp.position} | ${exp.company}`;
        } else if (exp.position) {
          titleText = exp.position;
        } else if (exp.company) {
          titleText = exp.company;
        }
        
        if (titleText) {
          doc.setFontSize(12);
          doc.setTextColor(...secondaryColor);
          doc.setFont("helvetica", "bold");
          doc.text(titleText, margin, yPosition);
          yPosition += 5;
        }

        // Duration
        if (exp.duration) {
          doc.setFontSize(10);
          doc.setTextColor(120, 120, 120);
          doc.setFont("helvetica", "italic");
          doc.text(exp.duration, margin, yPosition);
          yPosition += 5;
        }

        // Description
        if (exp.description) {
          const descriptionLines = exp.description.split('\n')
            .filter(line => line.trim())
            .map(line => line.trim().replace(/^[•\-]\s*/, ''));
          
          addBulletList(descriptionLines);
        }

        yPosition += 8;
      });
    }

    // Education
    if (formValues.education && formValues.education.length > 0) {
      addSectionHeader("Education");
      formValues.education.forEach((edu, index) => {
        // Degree and institution
        let eduText = '';
        if (edu.degree && edu.institution) {
          eduText = `${edu.degree} | ${edu.institution}`;
        } else if (edu.degree) {
          eduText = edu.degree;
        } else if (edu.institution) {
          eduText = edu.institution;
        }
        
        if (eduText) {
          doc.setFontSize(12);
          doc.setTextColor(...secondaryColor);
          doc.setFont("helvetica", "bold");
          doc.text(eduText, margin, yPosition);
          yPosition += 5;
        }

        // Duration and details
        if (edu.duration || edu.description) {
          const details = [];
          if (edu.duration) details.push(edu.duration);
          if (edu.description) details.push(edu.description);
          
          doc.setFontSize(10);
          doc.setTextColor(120, 120, 120);
          doc.setFont("helvetica", "normal");
          
          const detailsText = details.join(' • ');
          const lines = doc.splitTextToSize(detailsText, contentWidth);
          doc.text(lines, margin, yPosition);
          yPosition += lines.length * 4 + 8;
        }
      });
    }

    // Projects
    if (formValues.projects && formValues.projects.length > 0) {
      addSectionHeader("Projects");
      formValues.projects.forEach((proj, index) => {
        // Project title
        if (proj.title) {
          doc.setFontSize(12);
          doc.setTextColor(...secondaryColor);
          doc.setFont("helvetica", "bold");
          doc.text(proj.title, margin, yPosition);
          yPosition += 5;
        }

        // Duration
        if (proj.duration) {
          doc.setFontSize(10);
          doc.setTextColor(120, 120, 120);
          doc.setFont("helvetica", "italic");
          doc.text(proj.duration, margin, yPosition);
          yPosition += 5;
        }

        // Description
        if (proj.description) {
          const descriptionLines = proj.description.split('\n')
            .filter(line => line.trim())
            .map(line => line.trim().replace(/^[•\-]\s*/, ''));
          
          addBulletList(descriptionLines);
        }

        yPosition += 8;
      });
    }

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
    }

    doc.save(`${user?.fullName?.replace(/\s+/g, '_') || "resume"}_${new Date().getFullYear()}.pdf`);
    toast.success("Professional PDF resume downloaded successfully!");
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("Failed to generate PDF. Please try again.");
  } finally {
    setIsGenerating(false);
  }
};

  const onSubmit = async (data) => {
    try {
      const formattedContent = previewContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      await saveResumeFn(formattedContent);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save resume");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="font-bold text-3xl md:text-4xl lg:text-5xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Resume Builder
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Resume
              </>
            )}
          </Button>
          <Button 
            onClick={generatePDF} 
            disabled={isGenerating}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
         <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
  {/* Contact Information */}
  <div className="space-y-4 p-6 border rounded-lg shadow-sm border-gray-600 bg-black">
    <h3 className="text-xl font-semibold text-white">Contact Information</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Email</label>
        <Input
          {...register("contactInfo.email")}
          type="email"
          placeholder="your@email.com"
          className={`bg-gray-900 text-white border-gray-600 ${errors.contactInfo?.email ? "border-red-500" : ""}`}
        />
        {errors.contactInfo?.email && (
          <p className="text-sm text-red-500">
            {errors.contactInfo.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Mobile Number</label>
        <Input
          {...register("contactInfo.mobile")}
          type="tel"
          placeholder="+1 234 567 8900"
          className={`bg-gray-900 text-white border-gray-600 ${errors.contactInfo?.mobile ? "border-red-500" : ""}`}
        />
        {errors.contactInfo?.mobile && (
          <p className="text-sm text-red-500">
            {errors.contactInfo.mobile.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">LinkedIn URL</label>
        <Input
          {...register("contactInfo.linkedin")}
          type="url"
          placeholder="https://linkedin.com/in/your-profile"
          className={`bg-gray-900 text-white border-gray-600 ${errors.contactInfo?.linkedin ? "border-red-500" : ""}`}
        />
        {errors.contactInfo?.linkedin && (
          <p className="text-sm text-red-500">
            {errors.contactInfo.linkedin.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">
          Twitter/X Profile
        </label>
        <Input
          {...register("contactInfo.twitter")}
          type="url"
          placeholder="https://twitter.com/your-handle"
          className={`bg-gray-900 text-white border-gray-600 ${errors.contactInfo?.twitter ? "border-red-500" : ""}`}
        />
        {errors.contactInfo?.twitter && (
          <p className="text-sm text-red-500">
            {errors.contactInfo.twitter.message}
          </p>
        )}
      </div>
    </div>
  </div>

  {/* Summary */}
  <div className="space-y-4 p-6 border rounded-lg bg-black shadow-sm border-gray-600">
    <h3 className="text-xl font-semibold text-white">Professional Summary</h3>
    <Controller
      name="summary"
      control={control}
      render={({ field }) => (
        <Textarea
          {...field}
          className="min-h-[120px] bg-gray-900 text-white border-gray-600"
          placeholder="Write a compelling professional summary..."
        />
      )}
    />
    {errors.summary && (
      <p className="text-sm text-red-500">{errors.summary.message}</p>
    )}
  </div>

  {/* Skills */}
  <div className="space-y-4 p-6 border rounded-lg bg-black shadow-sm border-gray-600">
    <h3 className="text-xl font-semibold text-white">Skills</h3>
    <Controller
      name="skills"
      control={control}
      render={({ field }) => (
        <Textarea
          {...field}
          className="min-h-[120px] bg-gray-900 text-white border-gray-600"
          placeholder="List your key skills (one per line or comma-separated)..."
        />
      )}
    />
    {errors.skills && (
      <p className="text-sm text-red-500">{errors.skills.message}</p>
    )}
  </div>

  {/* Experience */}
  <div className="space-y-4 p-6 border rounded-lg bg-black shadow-sm border-gray-600">
    <h3 className="text-xl font-semibold text-white">Work Experience</h3>
    <Controller
      name="experience"
      control={control}
      render={({ field }) => (
        <EntryForm
          type="Experience"
          entries={field.value}
          onChange={field.onChange}
        />
      )}
    />
    {errors.experience && (
      <p className="text-sm text-red-500">
        {errors.experience.message}
      </p>
    )}
  </div>

  {/* Education */}
  <div className="space-y-4 p-6 border rounded-lg bg-black shadow-sm border-gray-600">
    <h3 className="text-xl font-semibold text-white">Education</h3>
    <Controller
      name="education"
      control={control}
      render={({ field }) => (
        <EntryForm
          type="Education"
          entries={field.value}
          onChange={field.onChange}
        />
      )}
    />
    {errors.education && (
      <p className="text-sm text-red-500">
        {errors.education.message}
      </p>
    )}
  </div>

  {/* Projects */}
  <div className="space-y-4 p-6 border rounded-lg bg-black shadow-sm border-gray-600">
    <h3 className="text-xl font-semibold text-white">Projects</h3>
    <Controller
      name="projects"
      control={control}
      render={({ field }) => (
        <EntryForm
          type="Project"
          entries={field.value}
          onChange={field.onChange}
        />
      )}
    />
    {errors.projects && (
      <p className="text-sm text-red-500">
        {errors.projects.message}
      </p>
    )}
  </div>
</form></TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="bg-gray-50 p-4 md:p-8 rounded-lg border">
            <div id="resume-preview-content" className="bg-white shadow-lg">
              <ResumePreview content={previewContent} user={user} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="markdown" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResumeMode(resumeMode === "preview" ? "edit" : "preview")
                }
              >
                {resumeMode === "preview" ? (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Markdown
                  </>
                ) : (
                  <>
                    <Monitor className="mr-2 h-4 w-4" />
                    Show Preview
                  </>
                )}
              </Button>
            </div>
            
            {activeTab === "markdown" && resumeMode === "edit" && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Changes here won't update the form fields
                </span>
              </div>
            )}
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={600}
              preview={resumeMode}
              className="min-h-[600px]"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}