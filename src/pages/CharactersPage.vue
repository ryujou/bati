<script setup lang="ts">
import { useQuiz } from '../composables/useQuiz'
import { useI18n } from '../i18n'
import { getLocalizedCharacterName, getLocalizedCharacterSeries } from '../i18n/characters'

const { characters } = useQuiz()
const { locale, t } = useI18n()

function getCharacterBadge(name: string) {
  return name.slice(-2)
}
</script>

<template>
  <div class="page-stack">
    <section class="hero-panel center compact">
      <p class="eyebrow">{{ t('characters.eyebrow') }}</p>
      <h1 class="display-title">{{ t('characters.title') }}</h1>
      <p class="lead">{{ t('characters.lead') }}</p>
    </section>

    <section class="characters-grid">
      <RouterLink
        v-for="character in characters"
        :key="character.id"
        :to="{ path: '/result', query: { character: character.id } }"
        class="character-card"
        :style="{ '--accent-color': character.accent }"
        v-reveal
      >
        <div class="card-image-wrap">
          <img
            v-if="character.image"
            :src="character.image"
            :alt="getLocalizedCharacterName(character, locale)"
            class="card-image"
            loading="lazy"
          />
          <div v-else class="card-image-fallback">
            <span>{{ getCharacterBadge(getLocalizedCharacterName(character, locale)) }}</span>
          </div>
        </div>
        <div class="card-content">
          <div class="card-tags">
            <span class="card-code">{{ character.code }}</span>
            <span class="card-mbti">{{ character.matchCode }}</span>
          </div>
          <h2 class="card-name">{{ getLocalizedCharacterName(character, locale) }}</h2>
          <p class="card-source">{{ getLocalizedCharacterSeries(character, locale) }}</p>
          <p class="card-title">{{ t('characters.' + character.id + '.title', undefined, character.title) }}</p>
        </div>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.character-card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  color: inherit;
  border: 2px solid transparent;
}

.character-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-color, #42b883);
}

.card-image-wrap {
  width: 100%;
  aspect-ratio: 1;
  background-color: #f8f9fa;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  position: relative;
  background: linear-gradient(to bottom, #f8f9fa, color-mix(in srgb, var(--accent-color, #e9ecef) 20%, transparent));
}

.card-image {
  width: 90%;
  height: 90%;
  object-fit: contain;
  object-position: bottom;
  transform-origin: bottom center;
  transition: transform 0.3s ease;
}

.card-image-fallback {
  width: calc(100% - 24px);
  height: calc(100% - 24px);
  margin: 12px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color, #4aa3ff) 32%, white), transparent 38%),
    linear-gradient(145deg, color-mix(in srgb, var(--accent-color, #4aa3ff) 22%, white), color-mix(in srgb, var(--accent-color, #4aa3ff) 70%, #1f3557));
  color: white;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.card-image-fallback span {
  letter-spacing: 0.14em;
  text-indent: 0.14em;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 900;
}

.character-card:hover .card-image {
  transform: scale(1.05);
}

.card-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.card-code {
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--accent-color, #42b883);
  background: color-mix(in srgb, var(--accent-color, #42b883) 15%, transparent);
  padding: 0.2rem 0.6rem;
  border-radius: 100px;
}

.card-mbti {
  font-weight: 700;
  font-size: 0.85rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.2rem 0.6rem;
  border-radius: 100px;
}

.card-name {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 0 0.25rem 0;
  color: #212529;
}

.card-source {
  font-size: 0.85rem;
  color: #6c757d;
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}

.card-title {
  font-size: 0.9rem;
  color: #495057;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 600px) {
  .characters-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      padding: 1rem;
  }
  
  .card-content {
    padding: 0.75rem;
  }
  
  .card-name {
    font-size: 1.1rem;
  }

  .card-tags {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .card-title {
    font-size: 0.8rem;
  }
}
</style>
