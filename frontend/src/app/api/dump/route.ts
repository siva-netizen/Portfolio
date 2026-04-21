import { NextResponse } from "next/server";
import { getProfile, getExperiences, getProjects, getSkills, getAchievements } from "@/lib/api";

export async function GET() {
  try {
    const profile = await getProfile();
    const experiences = await getExperiences();
    const projects = await getProjects();
    const skills = await getSkills();
    const achievements = await getAchievements();

    return NextResponse.json({
      profile,
      experiences,
      projects,
      skills,
      achievements
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
