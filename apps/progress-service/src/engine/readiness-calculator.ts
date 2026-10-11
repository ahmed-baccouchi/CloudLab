import {
  SkillName,
  SkillLevelDto,
  CloudReadinessDto,
  ReadinessTier,
} from '@cloudlab/shared-types';

export class ReadinessCalculator {
  static calculate(
    skillsMap: Map<SkillName, number>,
    solvedChallengesCount: number,
    completedLessonsCount: number,
  ): CloudReadinessDto {
    const allSkills: SkillName[] = [
      SkillName.LINUX,
      SkillName.DOCKER,
      SkillName.KUBERNETES,
      SkillName.NETWORKING,
      SkillName.CICD,
      SkillName.DEVSECOPS,
    ];

    const skills: SkillLevelDto[] = allSkills.map((skill) => {
      const points = skillsMap.get(skill) || 0;
      // Normalization: 500 points = 100%
      const score = Math.min(100, Math.round((points / 500) * 100));

      let levelTitle = 'Novice';
      if (score >= 80) levelTitle = 'Expert';
      else if (score >= 60) levelTitle = 'Practitioner';
      else if (score >= 40) levelTitle = 'Associate';
      else if (score >= 20) levelTitle = 'Beginner';

      return {
        skill,
        score,
        points,
        levelTitle,
      };
    });

    const averageSkillScore = skills.reduce((acc, s) => acc + s.score, 0) / skills.length;
    // Blend with challenges completed
    const overallScore = Math.min(
      100,
      Math.round(averageSkillScore * 0.7 + Math.min(30, solvedChallengesCount * 10)),
    );

    let tier: ReadinessTier = 'NOVICE';
    if (overallScore >= 85) tier = 'LEAD_ARCHITECT';
    else if (overallScore >= 70) tier = 'SPECIALIST';
    else if (overallScore >= 50) tier = 'PROFESSIONAL';
    else if (overallScore >= 30) tier = 'ASSOCIATE';

    const recommendations: string[] = [];
    if (skills.find((s) => s.skill === SkillName.KUBERNETES)?.score! < 40) {
      recommendations.push('Complete the "Restore Broken Kubernetes Deployment" challenge to boost your container orchestration score.');
    }
    if (skills.find((s) => s.skill === SkillName.LINUX)?.score! < 40) {
      recommendations.push('Review the "Process Lifecycle & Signals" lesson to reinforce your systems diagnostics foundation.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Excellent profile balance! Tackle advanced incident scenarios to progress toward Lead Architect tier.');
    }

    return {
      overallScore,
      tier,
      skills,
      solvedChallengesCount,
      completedLessonsCount,
      recommendations,
    };
  }
}
