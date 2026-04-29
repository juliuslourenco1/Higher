import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Upload, X, Building2, CheckCircle2, Trash2 } from "lucide-react";
import { getLoginUrl } from "@/const";

const INDUSTRIES = [
  "Technology","Finance","Healthcare","Retail","Manufacturing",
  "Marketing","Legal","Real Estate","Education","Logistics",
  "Energy","Media","Consulting","Other",
] as const;

const COMPANY_SIZES = ["1-10","11-50","51-200","201-500","500+"] as const;

const PARTNERSHIP_GOALS = [
  "Co-marketing","Technology Integration","Distribution","Investment",
  "Joint Venture","Supplier / Vendor","Reseller","Strategic Alliance","Other",
] as const;

export default function ProfileSetup() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: existing, isLoading: profileLoading } = trpc.profile.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: posts = [] } = trpc.post.listByProfile.useQuery(
    { profileId: existing?.id || 0 },
    { enabled: !!existing?.id }
  );

  const [form, setForm] = useState({
    companyName: "",
    industry: "" as typeof INDUSTRIES[number] | "",
    companySize: "" as typeof COMPANY_SIZES[number] | "",
    description: "",
    website: "",
    location: "",
    partnershipGoals: [] as any[],
    logoUrl: "",
    logoKey: "",
    profileType: "business" as "business" | "freelance",
  });

  const [postForm, setPostForm] = useState({ title: "", description: "", hourlyRate: "" });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const verificationFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existing) {
      const goals = existing.partnershipGoals ? (JSON.parse(existing.partnershipGoals) as string[]) : [];
      setForm({
        companyName: existing.companyName,
        industry: existing.industry as typeof INDUSTRIES[number],
        companySize: existing.companySize as typeof COMPANY_SIZES[number],
        description: existing.description,
        website: existing.website || "",
        location: existing.location || "",
        partnershipGoals: goals as any,
        logoUrl: existing.logoUrl || "",
        logoKey: existing.logoKey || "",
        profileType: existing.profileType as "business" | "freelance",
      });
      if (existing.logoUrl) setLogoPreview(existing.logoUrl);
    }
  }, [existing]);

  const createMutation = trpc.profile.create.useMutation();
  const updateMutation = trpc.profile.update.useMutation();
  const uploadLogoMutation = trpc.profile.uploadLogo.useMutation();
  const uploadVerificationMutation = trpc.verification.uploadDocument.useMutation();
  const createPostMutation = trpc.post.create.useMutation();
  const deletePostMutation = trpc.post.delete.useMutation();
  const deleteProfileMutation = trpc.profileManagement.delete.useMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleLogoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const result = await uploadLogoMutation.mutateAsync({
        fileBase64: base64.split(",")[1] || "",
        mimeType: file.type,
      });
      setForm((f) => ({ ...f, logoUrl: result.url, logoKey: result.key }));
      setLogoPreview(result.url);
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleVerificationUpload = async () => {
    if (verificationDocs.length === 0) return;
    try {
      for (const file of verificationDocs) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        await uploadVerificationMutation.mutateAsync({
          fileBase64: base64.split(",")[1] || "",
          mimeType: file.type,
          documentType: file.name.endsWith(".pdf") ? "business_license" : "tax_id",
        });
      }
      setVerificationDocs([]);
      toast.success("Documents uploaded for verification");
    } catch (e) {
      toast.error("Failed to upload documents");
    }
  };

  const handleCreatePost = async () => {
    if (!postForm.title || !postForm.description || !postForm.hourlyRate) {
      toast.error("Fill all post fields");
      return;
    }
    try {
      await createPostMutation.mutateAsync({
        title: postForm.title,
        description: postForm.description,
        hourlyRate: parseInt(postForm.hourlyRate),
      });
      setPostForm({ title: "", description: "", hourlyRate: "" });
      utils.post.listByProfile.invalidate();
      toast.success("Post created");
    } catch (e) {
      toast.error("Failed to create post");
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deletePostMutation.mutateAsync({ postId });
      utils.post.listByProfile.invalidate();
      toast.success("Post deleted");
    } catch (e) {
      toast.error("Failed to delete post");
    }
  };

  const handleDeleteProfile = async () => {
    try {
      await deleteProfileMutation.mutateAsync();
      toast.success("Profile deleted");
      navigate("/");
    } catch (e) {
      toast.error("Failed to delete profile");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || form.industry === "" || form.companySize === "" || !form.description) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      if (existing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          ...(form as any),
          partnershipGoals: JSON.stringify(form.partnershipGoals),
        });
        toast.success("Profile updated");
      } else {
        await createMutation.mutateAsync({
          ...(form as any),
          partnershipGoals: JSON.stringify(form.partnershipGoals),
        });
        toast.success("Profile created!");
        navigate("/discover");
      }
    } catch (e) {
      toast.error("Failed to save profile");
    }
  };

  const toggleGoal = (goal: string) => {
    setForm((f) => ({
      ...f,
      partnershipGoals: f.partnershipGoals.includes(goal)
        ? f.partnershipGoals.filter((g) => g !== goal)
        : [...f.partnershipGoals, goal],
    }));
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button size="lg" onClick={() => (window.location.href = getLoginUrl())}>
          Login to continue
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black text-foreground mb-2">
          {existing ? "Edit Your Profile" : "Create Your Business Profile"}
        </h1>
        <p className="text-muted-foreground font-light mb-8">
          {existing
            ? "Update your information and manage your work posts."
            : "Tell us about your business so we can find the perfect matches."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Type */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base text-foreground mb-4">Profile Type *</h3>
            <div className="flex gap-4">
              {(["business", "freelance"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, profileType: type }))}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    form.profileType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-bold capitalize text-foreground">{type}</p>
                  <p className="text-xs text-muted-foreground font-light">
                    {type === "business" ? "Company or team" : "Freelancer or LLC"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Company Name */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <Label htmlFor="company" className="font-bold mb-2 block">
              Company Name *
            </Label>
            <Input
              id="company"
              placeholder="Your company name"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              required
            />
          </div>

          {/* Industry & Size */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <Label htmlFor="industry" className="font-bold mb-2 block">
                Industry *
              </Label>
              <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="size" className="font-bold mb-2 block">
                Company Size *
              </Label>
              <Select value={form.companySize} onValueChange={(v) => setForm((f) => ({ ...f, companySize: v as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <Label htmlFor="desc" className="font-bold mb-2 block">
              Description *
            </Label>
            <Textarea
              id="desc"
              placeholder="Tell us about your business..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={5}
              required
            />
          </div>

          {/* Logo Upload */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base text-foreground mb-4">Company Logo</h3>
            {logoPreview && (
              <div className="mb-4 flex items-center gap-4">
                <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogoPreview("");
                    setForm((f) => ({ ...f, logoUrl: "", logoKey: "" }));
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
            >
              <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG (max 5MB)</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
              className="hidden"
            />
          </div>

          {/* Verification Documents */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base text-foreground mb-1">Verify Your Business</h3>
            <p className="text-sm text-muted-foreground font-light mb-4">
              Upload documents to get a verification badge and boost your visibility.
            </p>
            {verificationDocs.length > 0 && (
              <div className="space-y-2 mb-4">
                {verificationDocs.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setVerificationDocs((d) => d.filter((_, i) => i !== idx))}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => verificationFileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
            >
              <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload documents</p>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB each)</p>
            </button>
            <input
              ref={verificationFileRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setVerificationDocs((d) => [...d, ...files]);
              }}
              className="hidden"
            />
            {verificationDocs.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleVerificationUpload}
                disabled={uploadVerificationMutation.isPending}
                className="w-full mt-4"
              >
                {uploadVerificationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...
                  </>
                ) : (
                  "Upload Documents"
                )}
              </Button>
            )}
          </div>

          {/* Website & Location */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base text-foreground mb-4">Additional Info</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="website" className="font-medium mb-1.5 block">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="location" className="font-medium mb-1.5 block">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Partnership Goals */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base text-foreground mb-1.5">Partnership Goals *</h3>
            <p className="text-sm text-muted-foreground font-light mb-4">
              Select all that apply — this helps us match you with the right partners.
            </p>
            <div className="flex flex-wrap gap-2">
              {PARTNERSHIP_GOALS.map((goal) => {
                const selected = form.partnershipGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full font-bold text-base" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
              </>
            ) : existing ? (
              "Save Changes"
            ) : (
              "Create Profile & Start Discovering"
            )}
          </Button>
        </form>

        {/* Work Posts Section */}
        {existing && (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-2xl font-black text-foreground mb-6">Your Work Posts</h2>

            {/* Create Post Form */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-base text-foreground mb-4">Create a Work Post</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="post-title" className="font-medium mb-1.5 block">
                    Title
                  </Label>
                  <Input
                    id="post-title"
                    placeholder="e.g., Web Design Services"
                    value={postForm.title}
                    onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="post-desc" className="font-medium mb-1.5 block">
                    Description
                  </Label>
                  <Textarea
                    id="post-desc"
                    placeholder="Describe the service or work you offer..."
                    value={postForm.description}
                    onChange={(e) => setPostForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="post-rate" className="font-medium mb-1.5 block">
                    Hourly Rate ($)
                  </Label>
                  <Input
                    id="post-rate"
                    type="number"
                    placeholder="50"
                    value={postForm.hourlyRate}
                    onChange={(e) => setPostForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending}
                  className="w-full"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...
                    </>
                  ) : (
                    "Create Post"
                  )}
                </Button>
              </div>
            </div>

            {/* Posts List */}
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-card border border-border rounded-2xl p-6 flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1">{post.title}</h4>
                      <p className="text-sm text-muted-foreground font-light mb-2">{post.description}</p>
                      <Badge className="bg-primary/10 text-primary">${post.hourlyRate}/hour</Badge>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Delete this post?")) {
                          handleDeletePost(post.id);
                        }
                      }}
                      className="text-destructive hover:text-destructive/80 ml-4"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted rounded-2xl">
                <p className="text-muted-foreground font-light">No posts yet. Create one to showcase your services!</p>
              </div>
            )}
          </div>
        )}

        {/* Delete Profile Section */}
        {existing && (
          <div className="mt-12 border-t border-border pt-8">
            <div className="bg-card border border-red-200 rounded-2xl p-6">
              <h3 className="font-bold text-base text-red-600 mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground font-light mb-4">
                Permanently delete your profile and all associated data.
              </p>
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure? This cannot be undone. All your posts, matches, and messages will be deleted."
                    )
                  ) {
                    handleDeleteProfile();
                  }
                }}
                disabled={deleteProfileMutation.isPending}
                className="w-full"
              >
                {deleteProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Deleting...
                  </>
                ) : (
                  "Delete Profile"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
